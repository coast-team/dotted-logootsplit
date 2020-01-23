import { Pos } from "../../core/pos"
import { Concat } from "../../core/concat"
import {
    del,
    ins,
    sub,
    ListOp,
    ListIns,
    ListSub,
    ListIterator,
    MutList,
} from "cow-list"
import { Block, BlockOrdering, LengthBlock } from "../../core/block"
import { Ordering } from "../../util/ordering"
import { assert } from "../../util/assert"
import { u32, isU32 } from "../../util/number"
import { BlockFactory } from "../../core/block-factory"
import { Ins } from "../../core/ins"
import { Del } from "../../core/del"
import { U32Range, RangeOrdering } from "../../core/u32-range"
import {
    OpEditableReplicatedList,
    OpReplicatedList,
} from "../../core/op-replicated-list"
import { Anchor } from "../.."

const block3wayComparison = <P extends Pos<P>, E extends Concat<E>>(
    ref: Block<P, E> | LengthBlock<P>
) => (b: Block<P, E>) => {
    switch (ref.compare(b)) {
        case BlockOrdering.AFTER:
        case BlockOrdering.APPENDABLE:
        case BlockOrdering.OVERLAPPING_AFTER:
            return Ordering.AFTER
        case BlockOrdering.SPLITTING:
        case BlockOrdering.INCLUDED_LEFT_BY:
        case BlockOrdering.INCLUDED_MIDDLE_BY:
        case BlockOrdering.INCLUDED_RIGHT_BY:
            return Ordering.EQUAL
        default:
            return Ordering.BEFORE
    }
}

export class BlockList<
    P extends Pos<P>,
    E extends Concat<E>
> extends OpReplicatedList<P, E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<P extends Pos<P>, E extends Concat<E>>(): BlockList<P, E> {
        return new BlockList(MutList.empty())
    }

    static from<P extends Pos<P>, E extends Concat<E>>(
        blocks: readonly Block<P, E>[]
    ): BlockList<P, E> {
        return new BlockList(MutList.from(blocks))
    }

    protected readonly blocks: MutList<Block<P, E>>

    constructor(blocks: MutList<Block<P, E>>) {
        super()
        this.blocks = blocks
    }

    get length(): u32 {
        return this.blocks.summary
    }

    reduceBlock<U>(f: (acc: U, b: Block<P, E>) => U, prefix: U): U {
        return this.blocks.reduce(f, prefix)
    }

    indexFrom(anchor: Anchor<P>): u32 {
        const it = this.blocks.atEqual((v) => {
            const blockIndex = v.indexFrom(anchor)
            if (blockIndex === 0) {
                return Ordering.BEFORE
            } else if (blockIndex === v.length) {
                return Ordering.AFTER
            } else {
                return Ordering.EQUAL
            }
        }, false)
        const value = it.value
        const offset = value !== undefined ? value.indexFrom(anchor) : 0
        return it.summary + offset
    }

    insertable(iBlock: Block<P, E>): Block<P, E>[] {
        const it = this.blocks.atEqual(block3wayComparison(iBlock), true)
        const result: Block<P, E>[] = []
        let iBlockPart: Block<P, E> | undefined = iBlock
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
                        Block<P, E>,
                        Block<P, E>
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

    insert(iBlock: Block<P, E>): Ins<E>[] {
        const it = this.blocks.atEqual(block3wayComparison(iBlock), true)
        const insertions = []
        const listOps: (ListIns<Block<P, E>> | ListSub<Block<P, E>>)[] = []
        let iBlockPart: Block<P, E> | undefined = iBlock
        let prependableIndex = 0
        let prependable: Block<P, E> | undefined
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
                        Block<P, E>,
                        Block<P, E>
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

    remove(dBlock: LengthBlock<P>): Del[] {
        const it = this.blocks.atEqual(block3wayComparison<P, E>(dBlock), true)
        const rmv = []
        const listOps: ListOp<Block<P, E>>[] = []
        let merge: ListSub<Block<P, E>> | undefined
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

export class EditableBlockList<P extends Pos<P>, E extends Concat<E>>
    extends BlockList<P, E>
    implements OpEditableReplicatedList<P, E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static emptyWith<P extends Pos<P>, E extends Concat<E>>(
        factory: BlockFactory<P>
    ): EditableBlockList<P, E> {
        return new EditableBlockList(MutList.empty(), factory)
    }

    static fromWith<P extends Pos<P>, E extends Concat<E>>(
        blocks: readonly Block<P, E>[],
        factory: BlockFactory<P>
    ): EditableBlockList<P, E> {
        return new EditableBlockList(MutList.from(blocks), factory)
    }

    /**
     * factory of blocks.
     */
    protected readonly factory: BlockFactory<P>

    constructor(blocks: MutList<Block<P, E>>, factory: BlockFactory<P>) {
        super(blocks)
        this.factory = factory
    }

    at(sIndex: u32): ListIterator<Block<P, E>> {
        assert(() => isU32(sIndex), "index ∈ u32")
        return this.blocks.atEqual((v, summary) => {
            if (sIndex <= summary) {
                return Ordering.BEFORE
            } else if (sIndex > summary + v.length) {
                return Ordering.AFTER
            }
            return Ordering.EQUAL
        }, false)
    }

    anchorAt(sIndex: u32, isAfter: boolean): Anchor<P> {
        assert(() => isU32(sIndex), "index ∈ u32")

        sIndex = Math.min(sIndex, this.length)
        const it = this.at(sIndex)
        let value = it.value
        if (sIndex === it.index && !isAfter) {
            return this.factory.bottomAnchor
        } else if (
            value !== undefined &&
            sIndex === it.index + value.length &&
            isAfter
        ) {
            it.forth()
            value = it.value
        }

        if (value === undefined) {
            return this.factory.topAnchor
        } else {
            if (!isAfter) {
                sIndex--
            }
            return value.anchor(sIndex - it.index, !isAfter)
        }
    }

    insertAt(sIndex: u32, items: E): Block<P, E> {
        assert(() => isU32(sIndex), "index ∈ u32")
        assert(() => items.length > 0, "items.length > 0")

        sIndex = Math.min(sIndex, this.length)
        const it = this.at(sIndex)
        let iBlock: Block<P, E>
        let listOps: ListOp<Block<P, E>>[]
        const value = it.value
        if (value === undefined) {
            // empty list
            iBlock = this.factory.from(items)
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
        } else if (it.index < sIndex) {
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
        } else {
            iBlock = this.factory.before(items, value)
            listOps = [ins(it.index, iBlock)]
        }

        this.blocks.apply(listOps)
        return iBlock
    }

    removeAt(sIndex: u32, length: u32): LengthBlock<P>[] {
        assert(() => isU32(sIndex), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")

        sIndex = Math.min(sIndex, this.length)
        const it = this.at(sIndex)
        let merge: ListSub<Block<P, E>> | undefined
        const result: LengthBlock<P>[] = []
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
                        const merged: Block<P, E> = merge.value.append(curr)
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
