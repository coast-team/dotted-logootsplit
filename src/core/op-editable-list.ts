import { del, ins, ListIns, ListOp, ListSub, MutList, sub } from "cow-list"
import { assert } from "../util/assert.js"
import { fromArray, FromPlain, isObject } from "../util/data-validation.js"
import { isU32, u32 } from "../util/number.js"
import { Block, BlockOrdering, LengthBlock } from "./block.js"
import type { BlockFactory, BlockFactoryConstructor } from "./block-factory.js"
import type { Concat } from "./concat.js"
import { Del } from "./del.js"
import { Ins } from "./ins.js"
import { posFinder, OpList, summaryFinder } from "./op-list.js"
import { RangeOrdering, U32Range } from "./u32-range.js"

/**
 * @param factory factory of blocks
 * @return new empty list.
 */
export const empty = <E extends Concat<E>>(
    factory: BlockFactory
): OpEditableList<E> => {
    return new OpEditableList(MutList.empty(), factory)
}

export const from = <E extends Concat<E>>(
    blocks: readonly Block<E>[],
    factory: BlockFactory
): OpEditableList<E> => {
    return new OpEditableList(MutList.from(blocks), factory)
}

export const fromPlain = <E extends Concat<E>>(
    f: BlockFactoryConstructor,
    itemFromPlain: FromPlain<E>
): FromPlain<OpEditableList<E>> => {
    return (x) => {
        if (
            isObject<{ blocks: unknown[]; factory: unknown }>(x) &&
            Array.isArray(x.blocks)
        ) {
            const blocks = fromArray(x.blocks, Block.fromPlain(itemFromPlain))
            const factory = f.fromPlain(x.factory)
            if (blocks !== undefined && factory !== undefined) {
                return from(blocks, factory)
            }
        }
        return undefined
    }
}

export class OpEditableList<E extends Concat<E>> extends OpList<E> {
    /**
     * Factory of blocks.
     */
    protected readonly factory: BlockFactory

    constructor(blocks: MutList<Block<E>>, factory: BlockFactory) {
        super(blocks)
        this.factory = factory
    }

    // Modification
    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt(sIndex: u32, items: E): Block<E> {
        assert(() => isU32(sIndex), "index ∈ u32")
        assert(() => items.length > 0, "items.length > 0")

        sIndex = Math.min(sIndex, this.length)
        const it = this.blocks.atEqual(summaryFinder(sIndex), true)
        let iBlock: Block<E>
        let listOps: ListOp<Block<E>>[]
        const value = it.value
        if (value === undefined || it.summary === sIndex) {
            iBlock = this.factory.between(undefined, items, value)
            listOps = [ins(it.index, iBlock)]
        } else if (it.summary + value.length === sIndex) {
            const predIndex = it.index
            const pred = value
            it.forth()
            const succ = it.value
            iBlock = this.factory.between(pred, items, succ)
            if (iBlock.compare(pred) === BlockOrdering.APPENDABLE) {
                listOps = [sub(predIndex, pred.append(iBlock))]
            } else if (
                succ !== undefined &&
                iBlock.compare(succ) === BlockOrdering.PREPENDABLE
            ) {
                listOps = [sub(it.index, iBlock.append(succ))]
            } else {
                listOps = [ins(it.index, iBlock)]
            }
        } else {
            // split
            const splitIndex = sIndex - it.summary
            const [lSplit, rSplit] = value.splitAt(splitIndex)
            iBlock = this.factory.between(lSplit, items, rSplit)
            const itIndex = it.index
            listOps = [
                sub(itIndex, rSplit),
                ins(itIndex, iBlock),
                ins(itIndex, lSplit),
            ]
        }

        this.blocks.apply(listOps)
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
    removeAt(sIndex: u32, length: u32): LengthBlock[] {
        assert(() => isU32(sIndex), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")

        sIndex = Math.min(sIndex, this.length)
        const it = this.blocks.atEqual(summaryFinder(sIndex), true)
        let merge: ListSub<Block<E>> | undefined
        const result: LengthBlock[] = []
        const listOps = []
        const dRange = U32Range.fromLength(sIndex, length)
        for (
            let curr = it.value;
            curr !== undefined;
            it.forth(), curr = it.value
        ) {
            const currRange = U32Range.fromLength(it.summary, curr.length)
            switch (dRange.compare(currRange)) {
                case RangeOrdering.APPENDABLE:
                case RangeOrdering.AFTER:
                    merge = sub(it.index, curr)
                    break
                case RangeOrdering.INCLUDED_RIGHT_BY:
                case RangeOrdering.OVERLAPPING_AFTER: {
                    const splitIndex = dRange.lower - currRange.lower
                    const [lSplit, rSplit] = curr.splitAt(splitIndex)
                    result.push(rSplit.toLengthBlock())
                    listOps.push(sub(it.index, lSplit))
                    break
                }
                case RangeOrdering.INCLUDING_LEFT:
                case RangeOrdering.INCLUDING_MIDDLE:
                case RangeOrdering.INCLUDING_RIGHT:
                case RangeOrdering.EQUAL: {
                    result.push(curr.toLengthBlock())
                    listOps.push(del(it.index))
                    break
                }
                case RangeOrdering.INCLUDED_MIDDLE_BY: {
                    const rSplitIndex = dRange.upper() + 1 - currRange.lower
                    const [lSplit, rSplit] = curr.splitAt(rSplitIndex)
                    const lSplitIndex = dRange.lower - currRange.lower
                    const [llSplit, lrSplit] = lSplit.splitAt(lSplitIndex)
                    result.push(lrSplit.toLengthBlock())
                    listOps.push(ins(it.index, llSplit), sub(it.index, rSplit))
                    it.complete()
                    break
                }
                case RangeOrdering.INCLUDED_LEFT_BY:
                case RangeOrdering.OVERLAPPING_BEFORE: {
                    const splitIndex = dRange.upper() + 1 - currRange.lower
                    const [lSplit, rSPlit] = curr.splitAt(splitIndex)
                    result.push(lSplit.toLengthBlock())
                    listOps.push(sub(it.index, rSPlit))
                    it.complete()
                    break
                }
                case RangeOrdering.PREPENDABLE:
                case RangeOrdering.BEFORE:
                    if (
                        merge !== undefined &&
                        merge.value.compare(curr) === BlockOrdering.PREPENDABLE
                    ) {
                        const merged: Block<E> = merge.value.append(curr)
                        listOps.push(sub(merge.index, merged))
                        listOps.push(del(it.index))
                    }
                    it.complete()
                    break
                default:
                    throw new Error("non-exhaustive switch")
            }
        }

        listOps.reverse()
        this.blocks.apply(listOps)

        return result
    }

    /**
     * [Mutation]
     * Insert {@link delta } in the list.
     * An insertion must be played exactly once.
     *
     * @param delta operation of insertion.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     *  Thus local operations must be played from left to right.
     */
    insert(iBlock: Block<E>): Ins<E>[] {
        const it = this.blocks.atEqual(posFinder(iBlock.lowerPos), true)
        const insertions = []
        const listOps: (ListIns<Block<E>> | ListSub<Block<E>>)[] = []
        let iBlockPart: Block<E> | undefined = iBlock
        let prependableIndex = 0
        let prependable: Block<E> | undefined
        for (
            let curr = it.value;
            curr !== undefined && iBlockPart !== undefined;
            it.forth(), curr = it.value
        ) {
            switch (iBlockPart.compare(curr)) {
                case BlockOrdering.AFTER:
                    break // do nothing
                case BlockOrdering.APPENDABLE:
                    prependableIndex = it.index
                    prependable = curr
                    break
                case BlockOrdering.PREPENDABLE: {
                    insertions.push(Ins.from(it.summary, iBlockPart.content))
                    const merged = iBlockPart.append(curr)
                    listOps.push(sub(it.index, merged))
                    iBlockPart = undefined
                    break
                }
                case BlockOrdering.BEFORE:
                    insertions.push(Ins.from(it.summary, iBlockPart.content))
                    listOps.push(ins(it.index, iBlockPart))
                    iBlockPart = undefined
                    break
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = iBlockPart.splitWith(curr) as [
                        Block<E>,
                        Block<E>
                    ] // FIXME
                    insertions.push(Ins.from(it.summary, lSplit.content))
                    listOps.push(ins(it.index, lSplit))
                    iBlockPart = rSplit
                    break
                }
                case BlockOrdering.SPLITTING: {
                    const [lSplit, rSplit] = curr.splitWith(iBlockPart)
                    insertions.push(
                        Ins.from(it.summary + lSplit.length, iBlockPart.content)
                    )
                    listOps.push(ins(it.index, lSplit))
                    listOps.push(ins(it.index, iBlockPart))
                    listOps.push(sub(it.index, rSplit))
                    iBlockPart = undefined
                    break
                }
                case BlockOrdering.OVERLAPPING_BEFORE:
                case BlockOrdering.OVERLAPPING_AFTER:
                case BlockOrdering.INCLUDED_MIDDLE_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.INCLUDING_MIDDLE:
                case BlockOrdering.INCLUDING_RIGHT:
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.EQUAL:
                    throw new Error("inserted block intersects with block(s)")
                default:
                    throw new Error("non-exhaustive switch")
            }
        }

        if (iBlockPart !== undefined) {
            insertions.push(Ins.from(it.summary, iBlockPart.content))
            listOps.push(ins(it.index, iBlockPart))
        }

        if (prependable !== undefined) {
            const appendable = listOps[0].value
            const replacing = prependable.append(appendable)
            listOps[0] = sub(prependableIndex, replacing)
        }

        this.blocks.apply(listOps.reverse())
        return insertions.reverse()
    }

    /**
     * [Mutation]
     * Remove {@link delta } from the list.
     * This operation is idempotent. You can play several times the same
     * deletion.
     * Note that a deletion should be played after insertions of the elements.
     *
     * @param delta operation of deletion.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.s
     *  Thus local operations must be played from left to right.
     */
    remove(dBlock: LengthBlock): Del[] {
        const it = this.blocks.atEqual(posFinder(dBlock.lowerPos), true)
        const rmv = []
        const listOps: ListOp<Block<E>>[] = []
        let merge: ListSub<Block<E>> | undefined
        for (
            let curr = it.value;
            curr !== undefined;
            it.forth(), curr = it.value
        ) {
            switch (dBlock.compare(curr)) {
                case BlockOrdering.APPENDABLE:
                case BlockOrdering.AFTER:
                    merge = sub(it.index, curr)
                    break
                case BlockOrdering.EQUAL:
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.INCLUDING_MIDDLE:
                case BlockOrdering.INCLUDING_RIGHT: {
                    const removed = curr.toLengthBlock()
                    rmv.push(Del.from(it.summary, removed.length))
                    listOps.push(del(it.index))
                    break
                }
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.OVERLAPPING_BEFORE: {
                    const appendable = curr.appendable(dBlock)
                    const removedLength = curr.length - appendable.length
                    rmv.push(Del.from(it.summary, removedLength))
                    listOps.push(sub(it.index, appendable))
                    merge = undefined
                    it.complete()
                    break
                }
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.OVERLAPPING_AFTER: {
                    const prependable = curr.prependable(dBlock)
                    const removedLength = curr.length - prependable.length
                    rmv.push(
                        Del.from(it.summary + prependable.length, removedLength)
                    )
                    listOps.push(sub(it.index, prependable))
                    merge = undefined
                    break
                }
                case BlockOrdering.INCLUDED_MIDDLE_BY: {
                    const prependable = curr.prependable(dBlock)
                    const appendable = curr.appendable(dBlock)
                    const removedLength =
                        curr.length - prependable.length - appendable.length
                    rmv.push(
                        Del.from(it.summary + prependable.length, removedLength)
                    )
                    listOps.push(
                        ins(it.index, prependable),
                        sub(it.index, appendable)
                    )
                    merge = undefined
                    break
                }
                case BlockOrdering.SPLITTED_BY:
                    break
                case BlockOrdering.PREPENDABLE:
                case BlockOrdering.BEFORE: {
                    if (
                        merge !== undefined &&
                        merge.value.compare(curr) === BlockOrdering.PREPENDABLE
                    ) {
                        const merged = merge.value.append(curr)
                        listOps.push(sub(merge.index, merged))
                        listOps.push(del(it.index))
                    }
                    it.complete()
                    break
                }
                case BlockOrdering.SPLITTING:
                    it.complete()
                    break
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
        listOps.reverse()
        this.blocks.apply(listOps)
        return rmv.reverse()
    }

    /**
     * [Mutation]
     * Apply {@see OpReplicatedList#remove} or {@see OpReplicatedList#insert}
     * according to the type of `delta`.
     *
     * @param delta operation
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     *  Thus local operations must be played from left to right.
     */
    applyOp(delta: Block<E>): Ins<E>[]
    applyOp(delta: LengthBlock): Del[]
    applyOp(delta: LengthBlock | Block<E>): Del[] | Ins<E>[]
    applyOp(delta: LengthBlock | Block<E>): Del[] | Ins<E>[] {
        if (delta.isLengthBlock()) {
            return this.remove(delta)
        } else {
            return this.insert(delta)
        }
    }
}
