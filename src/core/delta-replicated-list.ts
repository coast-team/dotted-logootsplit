import type { Concat } from "./concat.js"
import type {
    OpReplicatedList,
    OpEditableReplicatedList,
} from "./op-replicated-list.js"
import type { LengthBlock, Block } from "./block.js"
import { assert } from "../util/assert.js"
import { isU32, u32 } from "../util/number.js"
import { FromPlain, isObject } from "../util/data-validation.js"
import type { Anchor } from "./anchor.js"
import type { Ins } from "./ins.js"
import type { Del } from "./del.js"

export class DeltaReplicatedList<E extends Concat<E>> {
    static from<E extends Concat<E>>(
        list: OpReplicatedList<E>
    ): DeltaReplicatedList<E> {
        assert(() => list.length === 0, "list must be empty")
        return new DeltaReplicatedList(list, Object.create(null))
    }

    /**
     * @param opFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<E extends Concat<E>>(
        opFromPlain: FromPlain<OpReplicatedList<E>>
    ): FromPlain<DeltaReplicatedList<E>> {
        return (x) => {
            if (
                isObject<{ list: unknown; versionVector: unknown }>(x) &&
                isObject<{ [r: string]: unknown }>(x.versionVector)
            ) {
                const versionVector: { [r: string]: u32 } = Object.create(null)
                for (const replica in x.versionVector) {
                    if (x.versionVector.hasOwnProperty(replica)) {
                        const seq = x.versionVector[replica]
                        if (isU32(seq)) {
                            versionVector[replica] = seq
                        }
                    }
                }
                const list = opFromPlain(x.list)
                if (list !== undefined) {
                    return new DeltaReplicatedList(list, versionVector)
                }
            }
            return undefined
        }
    }

    protected readonly list: OpReplicatedList<E>

    // Access
    /**
     * Map replica to their last observed seq.
     */
    protected readonly versionVector: { [replica: string]: u32 | undefined }

    protected constructor(list: OpReplicatedList<E>, vv: { [r: string]: u32 }) {
        this.list = list
        this.versionVector = vv
    }

    readonlyVersionvector(): { readonly [replica: string]: u32 | undefined } {
        return this.versionVector
    }

    get length(): u32 {
        return this.list.length
    }

    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        return this.list.reduceBlock(f, prefix)
    }

    /**
     * @param prefix
     * @return Concatenated version prefixed by `prefix`.
     */
    concatenated(prefix: E): E {
        return this.list.concatenated(prefix)
    }

    /**
     * Non-cryptographic way to approximate object identity.
     * Do not take the blocks' content into account.
     */
    structuralHashCode(): u32 {
        return this.list.structuralHashCode()
    }

    private lastSeq(replica: string): u32 {
        const maybeLastSeq = this.versionVector[replica]
        if (maybeLastSeq !== undefined) {
            return maybeLastSeq
        }
        return 0
    }

    /**
     * @param index index where the anchor is
     * @param isAfter Is the anchor after `index`?
     * @return anchor at `index`.
     *  The anchor is sticked to the left position if isAfter is false.
     * Otherwise, it is sticked to the right position.
     */
    anchorAt(index: u32, isAfter: boolean): Anchor {
        assert(() => isU32(index), "index ∈ u32")
        return this.list.anchorAt(index, isAfter)
    }

    /**
     * @param anchor
     * @return index of `anchor`.
     */
    indexFrom(anchor: Anchor): u32 {
        return this.list.indexFrom(anchor)
    }

    /**
     * Complexity: O(1)
     *
     * @param delta
     * @return parts of `delta` that can be inserted.
     */
    insertable(delta: Block<E>): Block<E>[] {
        const lastSeq = this.lastSeq(String(delta.replica()))
        const deltaSeqs = delta.seqs()
        if (deltaSeqs.lower > lastSeq) {
            return [delta]
        } else if (deltaSeqs.upper() > lastSeq) {
            const remaining = delta.rightSplitAt(lastSeq + 1 - deltaSeqs.lower)
            return [remaining]
        }
        return []
    }

    /**
     * Complexity: O(S) where S depends of the chosen implementation.
     * e.g. for a balanced tree: S = log2(N) with N the number of blocks.
     *
     * @param delta
     * @return parts of `delta` that was removed.
     */
    removed(delta: Block<E>): LengthBlock[] {
        const lastSeq = this.lastSeq(String(delta.replica()))
        const deltaSeqs = delta.seqs()
        if (deltaSeqs.lower > lastSeq) {
            return []
        } else if (deltaSeqs.upper() > lastSeq) {
            const splittingIndex = lastSeq + 1 - deltaSeqs.lower
            const remaining = delta.leftSplitAt(splittingIndex)
            return this.list.insertable(remaining).map((block) => {
                return block.toLengthBlock()
            })
        }
        return this.list.insertable(delta).map((block) => {
            return block.toLengthBlock()
        })
    }

    protected bumpVersion(delta: Block<E> | LengthBlock): void {
        const lastSeq = this.lastSeq(String(delta.replica()))
        const deltaSeqs = delta.seqs()
        if (deltaSeqs.lower > lastSeq + 1) {
            throw new Error("FIFO violation")
        } else {
            this.versionVector[delta.replica()] = Math.max(
                lastSeq,
                deltaSeqs.upper()
            )
        }
    }

    insert(delta: Block<E>): Ins<E>[] {
        let result: Ins<E>[] = []
        for (const d of this.insertable(delta)) {
            const ins = this.list.insert(d)
            result = result.concat(ins)
        }
        this.bumpVersion(delta)
        return result
    }

    remove(delta: LengthBlock): Del[] {
        this.bumpVersion(delta)
        return this.list.remove(delta)
    }

    quickFilter(delta: Block<E>): Block<E>[]
    quickFilter(delta: LengthBlock): LengthBlock[]
    quickFilter(delta: LengthBlock | Block<E>): (LengthBlock | Block<E>)[]
    quickFilter(delta: LengthBlock | Block<E>): (LengthBlock | Block<E>)[] {
        if (delta.isLengthBlock()) {
            return [delta]
        } else {
            return this.insertable(delta)
        }
    }

    /**
     * [Mutation]
     *
     * @param delta
     *  if {@link delta } is a {@link Block }, it is an insertion.
     *  if {@link delta } is a {@link LengthBlock }, it is a removal.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     */
    applyDelta(delta: LengthBlock): Del[]
    applyDelta(delta: Block<E>): Ins<E>[]
    applyDelta(delta: LengthBlock | Block<E>): Del[] | Ins<E>[]
    applyDelta(delta: LengthBlock | Block<E>): Del[] | Ins<E>[] {
        if (delta.isLengthBlock()) {
            return this.remove(delta)
        } else {
            return this.insert(delta)
        }
    }

    /**
     * [Mutation]
     * Unidirectional merge from other to this.
     * This operation is idempotent.
     *
     * @param other
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     */
    merge(other: DeltaReplicatedList<E>): (Ins<E> | Del)[] {
        // determine inserted blocks in `other` and missing in `this`
        const inserted = other.reduceBlock((acc, block) => {
            return acc.concat(this.insertable(block))
        }, [] as Block<E>[])

        // determine removed block in `other` and present in `this`
        const removed = this.reduceBlock((acc, block) => {
            return acc.concat(other.removed(block))
        }, [] as LengthBlock[])

        // apply raw insertions and raw removals (bypassing causal context)
        let result: (Ins<E> | Del)[] = []
        for (const iBlock of inserted) {
            result = result.concat(this.list.insert(iBlock))
        }
        for (const dBlock of removed) {
            result = result.concat(this.list.remove(dBlock))
        }

        // merge causal contexts
        for (const replica in other.readonlyVersionvector()) {
            const otherLastSeq = other.readonlyVersionvector()[replica]
            const lastSeq = this.versionVector[replica]
            if (lastSeq !== undefined && otherLastSeq !== undefined) {
                this.versionVector[replica] = Math.max(lastSeq, otherLastSeq)
            } else if (otherLastSeq !== undefined) {
                this.versionVector[replica] = otherLastSeq
            }
        }

        return result
    }
}

export class DeltaEditableReplicatedList<
    E extends Concat<E>
> extends DeltaReplicatedList<E> {
    static override from<E extends Concat<E>>(
        list: OpEditableReplicatedList<E>
    ): DeltaEditableReplicatedList<E> {
        assert(() => list.length === 0, "list must be empty")
        return new DeltaEditableReplicatedList(list, Object.create(null))
    }

    /**
     * @param opFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static override fromPlain<E extends Concat<E>>(
        opFromPlain: FromPlain<OpEditableReplicatedList<E>>
    ): FromPlain<DeltaEditableReplicatedList<E>> {
        return (x) => {
            if (
                isObject<{ list: unknown; versionVector: unknown }>(x) &&
                isObject<{ [r: string]: unknown }>(x.versionVector)
            ) {
                const versionVector: { [r: string]: u32 } = Object.create(null)
                for (const replica in x.versionVector) {
                    if (x.versionVector.hasOwnProperty(replica)) {
                        const seq = x.versionVector[replica]
                        if (isU32(seq)) {
                            versionVector[replica] = seq
                        }
                    }
                }
                const list = opFromPlain(x.list)
                if (list !== undefined) {
                    return new DeltaEditableReplicatedList(list, versionVector)
                }
            }
            return undefined
        }
    }

    protected override readonly list: OpEditableReplicatedList<E>

    protected constructor(
        list: OpEditableReplicatedList<E>,
        vv: { [r: string]: u32 }
    ) {
        super(list, vv)
        this.list = list
    }

    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt(index: u32, items: E): Block<E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => items.length > 0, "items is not empty")

        const iBlock = this.list.insertAt(index, items)
        this.versionVector[iBlock.replica()] = iBlock.seqs().upper()
        return iBlock
    }

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt(index: u32, length: u32): LengthBlock[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")

        return this.list.removeAt(index, length)
    }
}
