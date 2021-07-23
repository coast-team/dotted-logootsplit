import {
    del,
    ins,
    ListIns, ListOp,
    ListSub,
    MutList,
    sub
} from "cow-list"
import { Anchor } from "../index.js"
import { assert } from "../util/assert.js"
import { fromArray, FromPlain, isObject } from "../util/data-validation.js"
import { isU32, u32 } from "../util/number.js"
import { Ordering } from "../util/ordering.js"
import type { BlockFactory, BlockFactoryConstructor } from "./block-factory.js"
import { BaseBlock, Block, BlockOrdering, LengthBlock } from "./block.js"
import type { Concat } from "./concat.js"
import { Del } from "./del.js"
import { Ins } from "./ins.js"
import {
    OpEditableReplicatedList,
    OpReplicatedList
} from "./op-replicated-list.js"
import type { Pos } from "./pos.js"
import { RangeOrdering, U32Range } from "./u32-range.js"

const posFinder = <E extends Concat<E>>(pos: Pos) => (b: BaseBlock) => {
    if (pos.compare(b.lowerPos) === Ordering.AFTER) {
        return Ordering.AFTER
    } else {
        return Ordering.BEFORE
    }
}

export const summaryFinder = (sIndex: u32) => (
    v: BaseBlock,
    summary: u32
): Ordering => {
    if (sIndex <= summary) {
        return Ordering.BEFORE
    } else if (sIndex >= summary + v.length) {
        return Ordering.AFTER
    }
    return Ordering.EQUAL
}

export class BlockList<E extends Concat<E>> extends OpReplicatedList<E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<E extends Concat<E>>(): BlockList<E> {
        return new BlockList(MutList.empty())
    }

    static from<E extends Concat<E>>(
        blocks: readonly Block<E>[]
    ): BlockList<E> {
        return new BlockList(MutList.from(blocks))
    }

    static fromPlain<E extends Concat<E>>(
        f: BlockFactoryConstructor,
        itemFromPlain: FromPlain<E>
    ): FromPlain<BlockList<E>> {
        return (x) => {
            if (isObject<{ blocks: unknown[] }>(x) && Array.isArray(x)) {
                const blocks = fromArray(x, Block.fromPlain(itemFromPlain))
                if (blocks !== undefined) {
                    return BlockList.from(blocks)
                }
            }
            return undefined
        }
    }

    protected readonly blocks: MutList<Block<E>>

    constructor(blocks: MutList<Block<E>>) {
        super()
        this.blocks = blocks
    }

    get length(): u32 {
        return this.blocks.summary
    }

    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        return this.blocks.reduce(f, prefix)
    }

    asArray(): Block<E>[] {
        return this.blocks.reduce(
            (acc, v) => (acc.push(v), acc),
            [] as Block<E>[]
        )
    }

    anchorAt(sIndex: u32, isAfter: boolean): Anchor {
        assert(() => isU32(sIndex), "index ∈ u32")

        sIndex = Math.min(sIndex, this.length)
        const it = this.blocks.atEqual(summaryFinder(sIndex), true)
        let value = it.value
        if (sIndex === it.summary && !isAfter) {
            return Anchor.BOTTOM
        } else if (
            value !== undefined &&
            sIndex === it.summary + value.length &&
            isAfter
        ) {
            it.forth()
            value = it.value
        }

        if (value === undefined) {
            return Anchor.TOP
        } else {
            if (!isAfter) {
                sIndex--
            }
            return value.anchor(sIndex - it.summary, !isAfter)
        }
    }

    indexFrom(anchor: Anchor): u32 {
        const it = this.blocks.atEqual(posFinder(anchor.ref), false)
        const value = it.value
        const sOffset = value !== undefined ? value.indexFrom(anchor) : 0
        return it.summary + sOffset
    }

    insertable(iBlock: Block<E>): Block<E>[] {
        const it = this.blocks.atEqual(posFinder(iBlock.lowerPos), true)
        const result: Block<E>[] = []
        let iBlockPart: Block<E> | undefined = iBlock
        for (
            let curr = it.value;
            curr !== undefined && iBlockPart !== undefined;
            it.forth(), curr = it.value
        ) {
            switch (iBlockPart.compare(curr)) {
                case BlockOrdering.APPENDABLE:
                case BlockOrdering.AFTER:
                    break // do nothing
                case BlockOrdering.PREPENDABLE:
                case BlockOrdering.BEFORE:
                case BlockOrdering.SPLITTING:
                    result.push(iBlockPart)
                    iBlockPart = undefined
                    break
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = iBlockPart.splitWith(curr) as [
                        Block<E>,
                        Block<E>
                    ] // FIXME: useless type assertion
                    result.push(lSplit)
                    iBlockPart = rSplit
                    break
                }
                case BlockOrdering.INCLUDING_RIGHT:
                case BlockOrdering.OVERLAPPING_BEFORE:
                    result.push(iBlockPart.prependable(curr))
                    iBlockPart = undefined
                    break
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.OVERLAPPING_AFTER:
                    iBlockPart = iBlockPart.appendable(curr)
                    break
                case BlockOrdering.INCLUDING_MIDDLE: {
                    result.push(iBlockPart.prependable(curr))
                    iBlockPart = iBlockPart.appendable(curr)
                    break
                }
                case BlockOrdering.INCLUDED_MIDDLE_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.EQUAL:
                    iBlockPart = undefined
                    break
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
        if (iBlockPart !== undefined) {
            result.push(iBlockPart)
        }
        return result
    }

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
}

export class EditableBlockList<E extends Concat<E>>
    extends BlockList<E>
    implements OpEditableReplicatedList<E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static emptyWith<E extends Concat<E>>(
        factory: BlockFactory
    ): EditableBlockList<E> {
        return new EditableBlockList(MutList.empty(), factory)
    }

    static fromWith<E extends Concat<E>>(
        blocks: readonly Block<E>[],
        factory: BlockFactory
    ): EditableBlockList<E> {
        return new EditableBlockList(MutList.from(blocks), factory)
    }

    static override fromPlain<E extends Concat<E>>(
        f: BlockFactoryConstructor,
        itemFromPlain: FromPlain<E>
    ): FromPlain<EditableBlockList<E>> {
        return (x) => {
            if (
                isObject<{ blocks: unknown[]; factory: unknown }>(x) &&
                Array.isArray(x.blocks)
            ) {
                const blocks = fromArray(
                    x.blocks,
                    Block.fromPlain(itemFromPlain)
                )
                const factory = f.fromPlain(x.factory)
                if (blocks !== undefined && factory !== undefined) {
                    return EditableBlockList.fromWith(blocks, factory)
                }
            }
            return undefined
        }
    }

    /**
     * factory of blocks.
     */
    readonly factory: BlockFactory

    constructor(blocks: MutList<Block<E>>, factory: BlockFactory) {
        super(blocks)
        this.factory = factory
    }

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
                    const [lSplit, rSplit] = curr.splitAt(splitIndex)
                    result.push(lSplit.toLengthBlock())
                    listOps.push(sub(it.index, rSplit))
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
}
