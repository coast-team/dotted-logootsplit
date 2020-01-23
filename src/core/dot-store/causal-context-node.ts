import { U32Range, RangeOrdering } from "../u32-range"
import { u32, i32 } from "replayable-random/dist/types/util/number"

export type Node = ValuedNode | undefined

function rankOf(node: Node): u32 {
    if (node !== undefined) {
        return node.rank
    }
    return 0
}

export class ValuedNode {
    static leaf(iRange: U32Range): ValuedNode {
        return new ValuedNode(undefined, iRange, undefined)
    }

    readonly left: Node

    value: U32Range

    readonly right: Node

    rank: u32

    constructor(l: Node, v: U32Range, r: Node) {
        this.left = l
        this.value = v
        this.right = r
        this.rank = 0
        this.update()
    }

    // Basic changes
    setLeft(l: Node): void {
        ;(this as { left: Node }).left = l
        this.update()
    }

    setRight(r: Node): void {
        ;(this as { right: Node }).right = r
        this.update()
    }

    update(): void {
        this.rank = 1 + Math.max(rankOf(this.left), rankOf(this.right))
    }

    updated(): ValuedNode {
        return this.balance()
    }

    // Balancing
    balanceFactor(): i32 {
        return rankOf(this.right) - rankOf(this.left)
    }

    isBalanced(): boolean {
        const balanceFactor = this.balanceFactor()
        return -2 < balanceFactor && balanceFactor < 2
    }

    isRightUnbalanced(): this is this & { right: ValuedNode } {
        return this.balanceFactor() >= 2
    }

    isRightOriented(): this is this & { right: ValuedNode } {
        return this.balanceFactor() === 1
    }

    isLeftOriented(): this is this & { left: ValuedNode } {
        return this.balanceFactor() <= -2
    }

    isSlighlyLeftUnbalanced(): this is this & { left: ValuedNode } {
        return this.balanceFactor() === -1
    }

    rotateLeft(this: this & { right: ValuedNode }): ValuedNode {
        const r = this.right
        this.setRight(r.left)
        r.setLeft(this)
        return r
    }

    rotateRight(this: this & { left: ValuedNode }): ValuedNode {
        const l = this.left
        this.setLeft(l.right)
        l.setRight(this)
        return l
    }

    balance(): ValuedNode {
        let self: ValuedNode = this
        while (self.isRightUnbalanced()) {
            if (self.right.isSlighlyLeftUnbalanced()) {
                self.setRight(self.right.rotateRight())
            }
            self = self.rotateLeft()
        }
        while (self.isLeftOriented()) {
            if (self.left.isRightOriented()) {
                self.setLeft(self.left.rotateLeft())
            }
            self = self.rotateRight()
        }
        return self
    }

    // Traversal
    min(): U32Range {
        if (this.left !== undefined) {
            return this.left.min() // tail recursion
        }
        return this.value
    }

    max(): U32Range {
        if (this.right !== undefined) {
            return this.right.max() // tail recursion
        }
        return this.value
    }

    predecessor(): U32Range | undefined {
        if (this.left !== undefined) {
            return this.left.max()
        }
        return undefined
    }

    successor(): U32Range | undefined {
        if (this.right !== undefined) {
            return this.right.min()
        }
        return undefined
    }

    // Removal
    removeMin(): Node {
        if (this.left !== undefined) {
            this.setLeft(this.left.removeMin())
            return this.balance()
        }
        return this.right
    }

    removeMax(): Node {
        if (this.right !== undefined) {
            this.setRight(this.right.removeMax())
            return this.balance()
        }
        return this.left
    }

    /** @Override */
    removePredecessor(): void {
        if (this.left !== undefined) {
            this.setLeft(this.left.removeMax())
        }
        // delegate balance to parent
    }

    /** @Override */
    removeSuccessor(): void {
        if (this.right !== undefined) {
            this.setRight(this.right.removeMin())
        }
        // delegate balance to parent
    }

    // merge
    mergeLeft(): void {
        const curr = this.value
        const prev = this.predecessor()
        if (
            prev !== undefined &&
            prev.compare(curr) === RangeOrdering.PREPENDABLE
        ) {
            this.removePredecessor()
            this.value = prev.append(curr)
        }
    }

    mergeRight(): void {
        const curr = this.value
        const succ = this.successor()
        if (
            succ !== undefined &&
            succ.compare(curr) === RangeOrdering.APPENDABLE
        ) {
            this.removeSuccessor()
            this.value = curr.append(succ)
        }
    }

    // insertable
    insertableLeft(iRange: U32Range): U32Range[] {
        if (this.left !== undefined) {
            return this.left.insertable(iRange)
        }
        return [iRange]
    }

    insertableRight(iRange: U32Range): U32Range[] {
        if (this.right !== undefined) {
            return this.right.insertable(iRange)
        }
        return [iRange]
    }

    insertable(iRange: U32Range): U32Range[] {
        const curr = this.value
        switch (iRange.compare(curr)) {
            case RangeOrdering.PREPENDABLE:
            case RangeOrdering.BEFORE:
                return this.insertableLeft(iRange)
            case RangeOrdering.APPENDABLE:
            case RangeOrdering.AFTER:
                return this.insertableRight(iRange)
            case RangeOrdering.INCLUDING_RIGHT:
            case RangeOrdering.OVERLAPPING_BEFORE:
                return this.insertableLeft(iRange.prependable(curr))
            case RangeOrdering.INCLUDING_LEFT:
            case RangeOrdering.OVERLAPPING_AFTER:
                return this.insertableRight(iRange.appendable(curr))
            case RangeOrdering.INCLUDING_MIDDLE: {
                const lIns = this.insertableLeft(iRange.prependable(curr))
                const rIns = this.insertableRight(iRange.appendable(curr))
                return lIns.concat(rIns)
            }
            case RangeOrdering.INCLUDED_MIDDLE_BY:
            case RangeOrdering.INCLUDED_RIGHT_BY:
            case RangeOrdering.INCLUDED_LEFT_BY:
            case RangeOrdering.EQUAL:
                return []
        }
    }

    // insert
    insertLeft(iRange: U32Range): U32Range[] {
        let ins
        if (this.left !== undefined) {
            ins = this.left.insert(iRange)
            this.setLeft(this.left.balance())
        } else {
            this.setLeft(ValuedNode.leaf(iRange))
            ins = [iRange]
        }
        // delegate balance to parent
        return ins
    }

    insertRight(iRange: U32Range): U32Range[] {
        let ins
        if (this.right !== undefined) {
            ins = this.right.insert(iRange)
            this.setRight(this.right.balance())
        } else {
            // should not happen
            this.setRight(ValuedNode.leaf(iRange))
            ins = [iRange]
        }
        // delegate balance to parent
        return ins
    }

    insert(iBlock: U32Range): U32Range[] {
        const curr = this.value
        switch (iBlock.compare(curr)) {
            case RangeOrdering.BEFORE:
                return this.insertLeft(iBlock)
            case RangeOrdering.AFTER:
                return this.insertRight(iBlock)
            case RangeOrdering.PREPENDABLE: {
                const lIns = this.insertLeft(iBlock)
                this.mergeLeft()
                return lIns
            }
            case RangeOrdering.APPENDABLE: {
                const rIns = this.insertRight(iBlock)
                this.mergeRight()
                return rIns
            }
            case RangeOrdering.OVERLAPPING_BEFORE:
            case RangeOrdering.OVERLAPPING_AFTER:
            case RangeOrdering.INCLUDED_MIDDLE_BY:
            case RangeOrdering.INCLUDED_RIGHT_BY:
            case RangeOrdering.INCLUDED_LEFT_BY:
            case RangeOrdering.INCLUDING_MIDDLE:
            case RangeOrdering.INCLUDING_RIGHT:
            case RangeOrdering.INCLUDING_LEFT:
            case RangeOrdering.EQUAL:
                throw new Error(
                    "inserted value intersects with one or more existing blocks"
                )
        }
    }
}
