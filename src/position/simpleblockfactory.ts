/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, AleaState } from "replayable-random"

import { assert, heavyAssert } from "../core/assert"
import { SimplePosition } from "./simpleposition"
import { SimplePositionPart } from "./simplepositionpart"
import { isUint32, nextRandomUint32, uint32, UINT32_TOP } from "../core/number"
import { Ordering } from "../core/ordering"
import { BlockFactory } from "../core/blockfactory"

/**
 * Factory of block with {@link SimplePosition } as implementation of
 * {@link Position}.
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class SimpleBlockFactory extends BlockFactory<SimplePosition> {
    /**
     * @param posBounds {@link SimpleBlockFactory#replica }
     * @param seq {@link SimpleBlockFactory#seq }
     * @param randState random generator's state
     */
    constructor (replica: uint32, seq: uint32, randState: AleaState) {
        assert(() => isUint32(replica), "replica ∈ uint32")
        assert(() => replica !== UINT32_TOP,
            "replica != UINT32_TOP. This is reserved for BOTTOM and TOP positions.")
        super(SimplePosition)
        assert(() => isUint32(seq), "seq ∈ uint32")
        this.replica = replica
        this.seq = seq
        this.randState = randState
    }

    /**
     * The random generator is seeded with both globalSeed and replica.
     *
     * @param replica {@link SimpleBlockFactory#replica }
     * @param globalSeed Seed for predictable random generation.
     * @return New factory with 0 as {@link SimpleBlockFactory#seq }
     */
    static from (replica: uint32, globalSeed: string): SimpleBlockFactory {
        assert(() => isUint32(replica), "replica ∈ uint32")
        assert(() => replica !== UINT32_TOP,
            "replica != UINT32_TOP. This is reserved for BOTTOM and TOP positions.")
        const seed = globalSeed + replica
        const randState = alea.from(seed)
        return new SimpleBlockFactory(replica, 0, randState)
    }

// Access
    /** @Override */
    readonly replica: uint32

    /** @Override */
    readonly seq: uint32

    readonly randState: AleaState

// Derivation
    /**
     * @param by
     * @param randState
     * @return Same factory, but with {@link SimpleBlockFactory#seq }
     * increased by {@link by } and {@link SimpleBlockFactory#randState }
     * replaced by {@link randState }
     */
    evolve (by: uint32, randState: AleaState): SimpleBlockFactory {
        assert(() => isUint32(by), "by ∈ uint32")
        assert(() => isUint32(this.seq + by), "no overflow")
        return new SimpleBlockFactory(this.replica, this.seq + by, randState)
    }

    /**
     * @param by
     * @return Same factory, but with {@link SimpleBlockFactory#seq }
     * increased by {@link by }
     */
    increasedSeq (by: uint32): SimpleBlockFactory {
        assert(() => isUint32(by), "by ∈ uint32")
        assert(() => isUint32(this.seq + by), "no overflow")
        return this.evolve(by, this.randState)
    }

// Impl
    /** @override */
    posBetween (l: SimplePosition, length: uint32, u: SimplePosition): [SimplePosition, SimpleBlockFactory] {
        heavyAssert(() => l.compare(u) === Ordering.BEFORE, "l < u")
        assert(() => isUint32(length), "length ∈ uint32")
        assert(() => length > 0, "length is strictly positive")
        assert(() => isUint32(this.seq + length), "no overflow")

        if (l.replica === this.replica && (l.seq + 1) === this.seq) {
            // Appendable
            return [l.intSuccessor(1), this.increasedSeq(length)]
        } else {
            const seqL = infiniteSequence(l.parts, SimplePositionPart.BOTTOM)
            const seqU = infiniteSequence(u.parts, SimplePositionPart.TOP)
            const parts: SimplePositionPart[] = []

            let partL = seqL.next().value
            let partU = seqU.next().value
            while ((partU.priority - partL.priority) < 2) {
                // Cannot insert a new part between partL and partU
                if (partU.replica === partL.replica) {
                    // Split
                    parts.push(partL)
                } else {
                    parts.push(partL.withSeq(UINT32_TOP))
                }
                partL = seqL.next().value
                partU = seqU.next().value
            }
            const [priority, s] =
                alea.u32Between(partL.priority + 1, partU.priority)(this.randState)
                // priority ∈ ]tuple1.priority, tuple2.priority[
                // tuple1.priority exclusion ensures a dense set
            parts.push(SimplePositionPart.from(priority, this.replica, this.seq))

            return [SimplePosition.from(parts), this.evolve(length, s)]
        }
    }
}

/**
 * @param values
 * @param defaultValue value to emit once {@link values } were emitted.
 * @return Infinite stream of values.
 */
function *infiniteSequence <T>
   (values: ReadonlyArray<T>, defaultValue: T): IterableIterator<T> {

    for (const v of values) {
        yield v
    }
    while (true) {
        yield defaultValue
    }
}
