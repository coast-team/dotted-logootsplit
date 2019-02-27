import { Pos } from "./pos"
import { Concat } from "./concat"
import { Block, BlockOrdering, LengthBlock } from "./block"
import { isU32, u32 } from "./number"
import { assert } from "./assert"
import { Ins, Del } from "./local-operation"
import { BlockFactory } from "./block-factory"
import { U32Range, RangeOrdering } from "./u32-range"

export abstract class BlockListContext<P extends Pos<P>, E extends Concat<E>> {
    abstract current(): Block<P, E>

    abstract currentRelativeIndex(): u32

    abstract predecessor(): Block<P, E> | undefined

    abstract successor(): Block<P, E> | undefined

    abstract insertPredecessor(iBlock: Block<P, E>): void

    abstract insertSuccessor(iBlock: Block<P, E>): void

    abstract insertableLeft(iBlock: Block<P, E>): Block<P, E>[]

    abstract insertableRight(iBlock: Block<P, E>): Block<P, E>[]

    abstract insertLeft(iBlock: Block<P, E>, minIndex: u32): Ins<E>[]

    abstract insertRight(iBlock: Block<P, E>, minIndex: u32): Ins<E>[]

    abstract insertAtLeft(idx: u32, items: E, f: BlockFactory<P>): Block<P, E>

    abstract insertAtRight(idx: u32, items: E, f: BlockFactory<P>): Block<P, E>

    abstract replace(block: Block<P, E>): void

    abstract removeCurrent(): void

    abstract removePredecessor(): void

    abstract removeSuccessor(): void

    abstract removeLeft(dBlock: LengthBlock<P>, minIndex: u32): Del[]

    abstract removeRight(dBlock: LengthBlock<P>, minIndex: u32): Del[]

    abstract removeAtLeft(dRange: U32Range, minIndex: u32): LengthBlock<P>[]

    abstract removeAtRight(dRange: U32Range, minIndex: u32): LengthBlock<P>[]

    mergeLeft(): void {
        const curr = this.current()
        const prev = this.predecessor()
        if (
            prev !== undefined &&
            prev.compare(curr) === BlockOrdering.PREPENDABLE
        ) {
            this.removePredecessor()
            this.replace(prev.append(curr))
        }
    }

    mergeRight(): void {
        const curr = this.current()
        const succ = this.successor()
        if (
            succ !== undefined &&
            succ.compare(curr) === BlockOrdering.APPENDABLE
        ) {
            this.removeSuccessor()
            this.replace(curr.append(succ))
        }
    }

    removeCurrentMerge(): void {
        const succ = this.successor()
        if (succ !== undefined) {
            this.replace(succ)
            this.removeSuccessor()
            this.mergeLeft()
        } else {
            const prev = this.predecessor()
            if (prev !== undefined) {
                this.replace(prev)
                this.removePredecessor()
            } else {
                this.removeCurrent()
            }
        }
    }

    insertable(iBlock: Block<P, E>): Block<P, E>[] {
        const curr = this.current()
        switch (iBlock.compare(curr)) {
            case BlockOrdering.PREPENDABLE:
            case BlockOrdering.BEFORE:
                return this.insertableLeft(iBlock)
            case BlockOrdering.APPENDABLE:
            case BlockOrdering.AFTER:
                return this.insertableRight(iBlock)
            case BlockOrdering.SPLITTED_BY: {
                const [lSplit, rSplit] = iBlock.splitWith(curr)
                const lIns = this.insertableLeft(lSplit)
                const rIns = this.insertableRight(rSplit)
                return lIns.concat(rIns)
            }
            case BlockOrdering.SPLITTING:
                return [iBlock]
            case BlockOrdering.INCLUDING_RIGHT:
            case BlockOrdering.OVERLAPPING_BEFORE:
                return this.insertableLeft(iBlock.prependable(curr))
            case BlockOrdering.INCLUDING_LEFT:
            case BlockOrdering.OVERLAPPING_AFTER:
                return this.insertableRight(iBlock.appendable(curr))
            case BlockOrdering.INCLUDING_MIDDLE: {
                const lIns = this.insertableLeft(iBlock.prependable(curr))
                const rIns = this.insertableRight(iBlock.appendable(curr))
                return lIns.concat(rIns)
            }
            case BlockOrdering.INCLUDED_MIDDLE_BY:
            case BlockOrdering.INCLUDED_RIGHT_BY:
            case BlockOrdering.INCLUDED_LEFT_BY:
            case BlockOrdering.EQUAL:
                return []
        }
    }

    insert(iBlock: Block<P, E>, minIndex: u32): Ins<E>[] {
        assert(() => isU32(minIndex), "minIndex ∈ u32")

        const curr = this.current()
        const currIndex = minIndex + this.currentRelativeIndex()
        const currEndIndex = currIndex + curr.length
        switch (iBlock.compare(curr)) {
            case BlockOrdering.BEFORE:
                return this.insertLeft(iBlock, minIndex)
            case BlockOrdering.AFTER:
                return this.insertRight(iBlock, currEndIndex)
            case BlockOrdering.PREPENDABLE: {
                const lIns = this.insertLeft(iBlock, minIndex)
                this.mergeLeft()
                return lIns
            }
            case BlockOrdering.APPENDABLE: {
                const rIns = this.insertRight(iBlock, currEndIndex)
                this.mergeRight()
                return rIns
            }
            case BlockOrdering.SPLITTED_BY: {
                const [lSplit, rSplit] = iBlock.splitWith(curr)
                const rIns = this.insertRight(rSplit, currEndIndex)
                const lIns = this.insertLeft(lSplit, minIndex)
                return rIns.concat(lIns)
            }
            case BlockOrdering.SPLITTING: {
                const [lSplit, rSplit] = curr.splitWith(iBlock)
                this.insertPredecessor(lSplit)
                this.replace(iBlock)
                const iBlockIndex = currIndex + lSplit.length
                this.insertSuccessor(rSplit)
                return [new Ins(iBlockIndex, iBlock.items)]
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
                throw new Error(
                    "inserted block intersects with one or more existing blocks"
                )
        }
    }

    insertAt(relIndex: u32, items: E, factory: BlockFactory<P>): Block<P, E> {
        assert(() => isU32(relIndex), "index ∈ u32")
        assert(() => items.length > 0, "items.length > 0")

        const curr = this.current()
        const currRelIndex = this.currentRelativeIndex()
        const currRelEndIndex = currRelIndex + curr.length
        if (relIndex < currRelIndex) {
            return this.insertAtLeft(relIndex, items, factory)
        } else if (relIndex === currRelIndex) {
            const iBlock = factory.between(this.predecessor(), items, curr)
            this.insert(iBlock, 0) // handle merge
            return iBlock
        } else if (relIndex < currRelEndIndex) {
            const [lSplit, rSplit] = curr.splitAt(relIndex - currRelIndex)
            const iBlock = factory.between(lSplit, items, rSplit)
            this.insert(iBlock, 0) // handle split
            return iBlock
        } else if (relIndex === currRelEndIndex) {
            const iBlock = factory.between(curr, items, this.successor())
            this.insert(iBlock, 0) // handle merge
            return iBlock
        } else {
            const subRelIndex = relIndex - currRelEndIndex
            return this.insertAtRight(subRelIndex, items, factory)
        }
    }

    remove(dBlock: LengthBlock<P>, minIndex: u32): Del[] {
        assert(() => isU32(minIndex), "minIndex ∈ u32")

        const curr = this.current()
        const currIndex = minIndex + this.currentRelativeIndex()
        const currEndIndex = currIndex + curr.length
        switch (dBlock.compare(curr)) {
            case BlockOrdering.PREPENDABLE:
            case BlockOrdering.BEFORE: {
                const lRmv = this.removeLeft(dBlock, minIndex)
                if (lRmv.length > 0 && lRmv[0].endIndex() === currIndex) {
                    this.mergeLeft()
                }
                return lRmv
            }
            case BlockOrdering.APPENDABLE:
            case BlockOrdering.AFTER: {
                const rRmv = this.removeRight(dBlock, currEndIndex)
                const rRmvLen = rRmv.length
                if (rRmvLen > 0 && rRmv[rRmvLen - 1].index === currEndIndex) {
                    this.mergeRight()
                }
                return rRmv
            }
            case BlockOrdering.INCLUDING_LEFT: {
                const rRmv = this.removeRight(dBlock, currEndIndex)
                const currRmv = this.remove(curr.toLengthBlock(), minIndex) // handle merge
                return rRmv.concat(currRmv)
            }
            case BlockOrdering.INCLUDING_RIGHT: {
                const lRmv = this.removeLeft(dBlock, minIndex)
                const currRmv = this.remove(curr.toLengthBlock(), minIndex) // handle merge
                return currRmv.concat(lRmv)
            }
            case BlockOrdering.INCLUDING_MIDDLE: {
                const rRmv = this.removeRight(dBlock, currEndIndex)
                const lRmv = this.removeLeft(dBlock, minIndex)
                const currRmv = this.remove(curr.toLengthBlock(), minIndex) // handle merge
                return rRmv.concat(currRmv).concat(lRmv)
            }
            case BlockOrdering.OVERLAPPING_BEFORE: {
                const removed = dBlock.intersection(curr)
                const rmv = this.remove(removed, minIndex)
                const lRmv = this.removeLeft(dBlock, minIndex)
                return rmv.concat(lRmv)
            }
            case BlockOrdering.OVERLAPPING_AFTER: {
                const rRmv = this.removeRight(dBlock, currEndIndex)
                const removed = dBlock.intersection(curr)
                const rmv = this.remove(removed, minIndex)
                return rRmv.concat(rmv)
            }
            case BlockOrdering.SPLITTED_BY: {
                const [lSplit, rSplit] = dBlock.splitWith(curr)
                const rRmv = this.remove(rSplit, minIndex) // handle merge
                const lRmv = this.remove(lSplit, minIndex) // handle merge
                return rRmv.concat(lRmv)
            }
            case BlockOrdering.EQUAL: {
                this.removeCurrentMerge()
                return [new Del(currIndex, curr.length)]
            }
            case BlockOrdering.INCLUDED_LEFT_BY: {
                this.replace(curr.appendable(dBlock))
                return [new Del(currIndex, dBlock.length)]
            }
            case BlockOrdering.INCLUDED_RIGHT_BY: {
                const replacing = curr.prependable(dBlock)
                this.replace(replacing)
                return [new Del(currIndex + replacing.length, dBlock.length)]
            }
            case BlockOrdering.INCLUDED_MIDDLE_BY: {
                const replacing = curr.prependable(dBlock)
                this.replace(replacing)
                this.insertSuccessor(curr.appendable(dBlock))
                return [new Del(currIndex + replacing.length, dBlock.length)]
            }
            case BlockOrdering.SPLITTING:
                return [] // already removed or not already inserted
        }
    }

    removeAt(dRange: U32Range, minIndex: u32): LengthBlock<P>[] {
        assert(() => isU32(minIndex), "minIndex ∈ u32")

        const curr = this.current()
        const currIndex = minIndex + this.currentRelativeIndex()
        const currEndIndex = currIndex + curr.length
        const currRange = U32Range.fromLength(currIndex, curr.length)
        switch (dRange.compare(currRange)) {
            case RangeOrdering.BEFORE:
                return this.removeAtLeft(dRange, minIndex)
            case RangeOrdering.AFTER:
                return this.removeAtRight(dRange, currEndIndex)
            case RangeOrdering.PREPENDABLE: {
                const lRmv = this.removeAtLeft(dRange, minIndex)
                this.mergeLeft()
                return lRmv
            }
            case RangeOrdering.APPENDABLE: {
                const rRmv = this.removeAtRight(dRange, currEndIndex)
                this.mergeRight()
                return rRmv
            }
            case RangeOrdering.OVERLAPPING_BEFORE: {
                const rmvRange = dRange.intersection(currRange)
                const currRmv = this.removeAt(rmvRange, minIndex)
                const lRmv = this.removeAtLeft(dRange, minIndex)
                return lRmv.concat(currRmv)
            }
            case RangeOrdering.OVERLAPPING_AFTER: {
                const rRmv = this.removeAtRight(dRange, currEndIndex)
                const rmvRange = dRange.intersection(currRange)
                const currRmv = this.removeAt(rmvRange, minIndex)
                return currRmv.concat(rRmv)
            }
            case RangeOrdering.EQUAL: {
                this.removeCurrentMerge()
                return [curr.toLengthBlock()]
            }
            case RangeOrdering.INCLUDING_LEFT: {
                const rRmv = this.removeAtRight(dRange, currEndIndex)
                this.removeCurrentMerge()
                return [curr.toLengthBlock()].concat(rRmv)
            }
            case RangeOrdering.INCLUDING_RIGHT: {
                const lRmv = this.removeAtLeft(dRange, minIndex)
                this.removeCurrentMerge()
                return lRmv.concat([curr.toLengthBlock()])
            }
            case RangeOrdering.INCLUDING_MIDDLE: {
                const rRmv = this.removeAtRight(dRange, currEndIndex)
                const lRmv = this.removeAtLeft(dRange, minIndex)
                this.removeCurrentMerge()
                return lRmv.concat([curr.toLengthBlock()]).concat(rRmv)
            }
            case RangeOrdering.INCLUDED_LEFT_BY: {
                const [lSplit, rSplit] = curr.splitAt(dRange.length)
                this.replace(rSplit)
                return [lSplit.toLengthBlock()]
            }
            case RangeOrdering.INCLUDED_RIGHT_BY: {
                const splitIndex = dRange.lower - currRange.lower
                const [lSplit, rSplit] = curr.splitAt(splitIndex)
                this.replace(lSplit)
                return [rSplit.toLengthBlock()]
            }
            case RangeOrdering.INCLUDED_MIDDLE_BY: {
                const rSplitIndex = dRange.upper() + 1 - currRange.lower
                const [lSplit, rSplit] = curr.splitAt(rSplitIndex)
                const lSplitIndex = dRange.lower - currRange.lower
                const [llSplit, lrSplit] = lSplit.splitAt(lSplitIndex)
                this.replace(llSplit)
                this.insertSuccessor(rSplit)
                return [lrSplit.toLengthBlock()]
            }
        }
    }
}
