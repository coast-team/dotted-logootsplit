import { assert } from "../util/assert.js"
import { FromPlain, isObject } from "../util/data-validation.js"
import { isU32, u32 } from "../util/number.js"
import type { Block, LengthBlock } from "./block.js"
import type { BlockFactory, BlockFactoryConstructor } from "./block-factory.js"
import type { Concat } from "./concat.js"
import type { Del } from "./del.js"
import { DeltaList } from "./delta-list.js"
import type { Ins } from "./ins.js"
import {
    OpEditableList,
    empty as opEditableListEmpty,
    fromPlain as opEditableFromPlain,
} from "./op-editable-list.js"

/**
 * @return new empty list.
 */
export const empty = <E extends Concat<E>>(
    factory: BlockFactory
): DeltaEditableList<E> => {
    return new DeltaEditableList(
        opEditableListEmpty(factory),
        Object.create(null)
    )
}

export const fromPlain = <E extends Concat<E>>(
    f: BlockFactoryConstructor,
    itemFromPlain: FromPlain<E>
): FromPlain<DeltaEditableList<E>> => {
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
            const list = opEditableFromPlain(f, itemFromPlain)(x.list)
            if (list !== undefined) {
                return new DeltaEditableList(list, versionVector)
            }
        }
        return undefined
    }
}

export class DeltaEditableList<E extends Concat<E>> extends DeltaList<E> {
    protected declare readonly list: OpEditableList<E>

    constructor(list: OpEditableList<E>, vv: { [r: string]: u32 }) {
        super(list, vv)
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
    merge(other: DeltaList<E>): (Ins<E> | Del)[] {
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
