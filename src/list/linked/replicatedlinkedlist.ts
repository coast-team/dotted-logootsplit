/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../../core/assert"
import { Block, LengthBlock } from "../../core/block"
import { BlockFactory } from "../../core/blockfactory"
import { Concat } from "../../core/concat"
import { Pos } from "../../core/pos"
import { Insertion, Deletion } from "../../core/localoperation"
import { digestOf, isU32, u32 } from "../../core/number"
import { ReadonlyReplicatedList, ReplicatedList } from "../../core/replicatedlist"
import { Sentinel } from "./replicatedlinkedlistcell"

export class ReadonlyReplicatedLinkedList <P extends Pos<P>, E extends Concat<E>>
    implements ReadonlyReplicatedList<P, E> {
    /**
     * New empty list.
     */
    constructor() {
        this.sentinel = new Sentinel()
        this.length = 0
        this.versionVector = {} //Object.create(null) is unsafe in TS
    }

// Access
    /**
     * Map replica to their last observed seq.
     */
    protected readonly versionVector: {[replica: string]: u32 | undefined}

    /**
     * Chain entry.
     */
    readonly sentinel: Sentinel<P, E>

    /** @Override */
    length: u32

    /** @Override */
    concatenated (prefix: E): E {
        return this.sentinel.reduceBlock((acc, b) => acc.concat(b.items), prefix)
    }

    /** @Override */
    structuralDigest (): u32 {
        return this.sentinel.reduceBlock(
            (acc, b) => digestOf([acc, b.structuralDigest()]), 0)
    }

// Modification
    /**
     * [Mutation]
     * Insert without updating and checking the version vector.
     * Do not use this function. It is exposed for testability purpose.
     *
     * @param block block to insert.
     * @return Performed modifications in terms of local insertions.
     *  The n+1 -th insertion depends on the effect of the n -th insertion.
     */
    insert (block: Block<P, E>): Insertion<E>[] {
        const result = this.sentinel.insert(block, 0)
        this.length = result.reduce((acc, v) => acc + v.length, this.length)
        return result
    }

    /**
     * [Mutation]
     * Delete without updating and checking the version vector.
     * Do not use this function. It is exposed for testability purpose.
     *
     * @param block block to remove.
     * @return Performed modifications in terms of local deletions.
     *  The n+1 -th deletion depends on the n -th deletion.
     */
    remove (block: LengthBlock<P>): Deletion[] {
        const result = this.sentinel.remove(block, 0)
        this.length = result.reduce((acc, v) => acc - v.length, this.length)
        return result
    }

    /** @Override */
    applyDelta(delta: LengthBlock<P>): Deletion[]
    applyDelta(delta: Block<P, E>): Insertion<E>[]
    applyDelta (delta: LengthBlock<P> | Block<P, E>): Deletion[] | Insertion<E>[] {
        const deltaSeqs = delta.seqs()
        //const lastSeq = this.versionVector.get(delta.replica)
        const lastSeq = this.versionVector[delta.replica()]

        if (delta.isLengthBlock()) {
            if (lastSeq !== undefined) {
                this.versionVector[delta.replica()] = Math.max(lastSeq, deltaSeqs.upper())
            } else {
                this.versionVector[delta.replica()] = deltaSeqs.upper()
            }
            return this.remove(delta)
        } else {
            if (lastSeq === undefined) {
                this.versionVector[delta.replica()] = deltaSeqs.upper()
                return this.insert(delta)
            } else if (deltaSeqs.lower > (lastSeq + 1)) {
                assert(() => false, "FIFO violation")
                return []
            } else if (deltaSeqs.upper() <= lastSeq) {
                return []
            } else {
                const remaining = delta.rightSplitAt(lastSeq + 1 - deltaSeqs.lower)
                this.versionVector[delta.replica()] = deltaSeqs.upper()
                return this.insert(remaining)
            }
        }
    }
}

export class ReplicatedLinkedList <P extends Pos<P>, E extends Concat<E>>
    extends ReadonlyReplicatedLinkedList<P, E>
    implements ReplicatedList<P, E> {

    /**
     * @param factory strategy of block generation.
     * @param items items to insert.
     */
    constructor(protected factory: BlockFactory<P>, items: E) {
        super()
        this.factory = factory
        if (items.length > 0) {
            this.insertAt(0, items)
        } else if (factory.seq > 0) {
            this.versionVector[factory.replica] = factory.seq - 1
        }
    }

// Modification
    /** @Override */
    insertAt (index: u32, items: E): Block<P, E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index <= this.length, "valid index")
        assert(() => items.length > 0, "items is not empty")
        assert(() => isU32(this.length + items.length), "(items.length + this.length) ∈ u32")
        const [result, newFactory] = this.sentinel.insertAt(index, items, this.factory)
        this.factory = newFactory
        this.length = this.length + items.length
        this.versionVector[result.replica()] = result.seqs().upper()
        return result
    }

    /** @Override */
    removeAt (index: u32, length: u32): LengthBlock<P>[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => isU32(index + length), "(index + length) ∈ u32")
        assert(() => length > 0, "length > 0")
        assert(() => (index + length) <= this.length, "(index + length) <= this.length")
        this.length = this.length - length
        return this.sentinel.removeAt(index, length)
    }
}
