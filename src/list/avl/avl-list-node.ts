import { u32, i32 } from "../../util/number"
import { Block, LengthBlock, BlockOrdering } from "../../core/block"
import { Concat } from "../../core/concat"
import { U32Range } from "../../core/u32-range"
import { heavyAssert } from "../../util/assert"
import { BlockListContext } from "../../core/block-list-context"
import { BlockFactory } from "../../core/block-factory"
import { FromPlain, isObject } from "../../util/data-validation"
import { Anchor } from "../../core/anchor"
import { Ins } from "../../core/ins"
import { Del } from "../../core/del"

export type Node<E extends Concat<E>> = ValuedNode<E> | undefined

export function lengthOf<E extends Concat<E>>(node: Node<E>): u32 {
    if (node !== undefined) {
        return node.length
    }
    return 0
}

function rankOf<E extends Concat<E>>(node: Node<E>): u32 {
    if (node !== undefined) {
        return node.rank
    }
    return 0
}

export class ValuedNode<E extends Concat<E>> extends BlockListContext<E> {
    static leaf<E extends Concat<E>>(block: Block<E>): ValuedNode<E> {
        return new ValuedNode(undefined, block, undefined)
    }

    /**
     * @param blockFromPlain
     * @return function that accepts a value and returns a Node from
     *  the value, or undefined if the value is mal-formed
     */
    static fromPlain<E extends Concat<E>>(
        blockFromPlain: FromPlain<Block<E>>
    ): FromPlain<ValuedNode<E>> {
        return (x: unknown) => {
            if (isObject<ValuedNode<E>>(x)) {
                const left = ValuedNode.fromPlain(blockFromPlain)(x.left)
                const right = ValuedNode.fromPlain(blockFromPlain)(x.right)
                const block = blockFromPlain(x.block)
                if (block !== undefined) {
                    return new ValuedNode(left, block, right)
                }
            }
            return undefined
        }
    }

    readonly left: Node<E>

    readonly block: Block<E>

    protected isSelfRemoved: boolean

    length: u32

    rank: u32

    readonly right: Node<E>

    protected constructor(l: Node<E>, block: Block<E>, r: Node<E>) {
        super()
        this.left = l
        this.block = block
        this.right = r
        this.isSelfRemoved = false
        this.length = 0
        this.rank = 0
        this.update()
    }

    // Basic changes
    setLeft(l: Node<E>): void {
        ;(this as { left: Node<E> }).left = l
        this.update()
    }

    replace(block: Block<E>): void {
        ;(this as { block: Block<E> }).block = block
        this.update()
    }

    setRight(r: Node<E>): void {
        ;(this as { right: Node<E> }).right = r
        this.update()
    }

    update(): void {
        this.length =
            lengthOf(this.left) + this.block.length + lengthOf(this.right)
        this.rank = 1 + Math.max(rankOf(this.left), rankOf(this.right))
    }

    // Balancing
    balanceFactor(): i32 {
        return rankOf(this.right) - rankOf(this.left)
    }

    isBalanced(): boolean {
        const balanceFactor = this.balanceFactor()
        return -2 < balanceFactor && balanceFactor < 2
    }

    isRightUnbalanced(): this is this & { right: ValuedNode<E> } {
        return this.balanceFactor() >= 2
    }

    isRightOriented(): this is this & { right: ValuedNode<E> } {
        return this.balanceFactor() === 1
    }

    isLeftOriented(): this is this & { left: ValuedNode<E> } {
        return this.balanceFactor() <= -2
    }

    isSlighlyLeftUnbalanced(): this is this & { left: ValuedNode<E> } {
        return this.balanceFactor() === -1
    }

    rotateLeft(this: this & { right: ValuedNode<E> }): ValuedNode<E> {
        const r = this.right
        this.setRight(r.left)
        r.setLeft(this)
        return r
    }

    rotateRight(this: this & { left: ValuedNode<E> }): ValuedNode<E> {
        const l = this.left
        this.setLeft(l.right)
        l.setRight(this)
        return l
    }

    balance(): ValuedNode<E> {
        let self: ValuedNode<E> = this
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

    // Self removal
    updated(): Node<E> {
        if (this.isSelfRemoved) {
            return undefined
        }
        return this.balance()
    }

    // Traversal
    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        let leftPrefix = prefix
        if (this.left !== undefined) {
            leftPrefix = this.left.reduceBlock(f, prefix)
        }
        leftPrefix = f(leftPrefix, this.block)
        if (this.right !== undefined) {
            return this.right.reduceBlock(f, leftPrefix)
        }
        return leftPrefix
    }

    // Impl
    current(): Block<E> {
        return this.block
    }

    currentRelativeIndex(): u32 {
        return lengthOf(this.left)
    }

    min(): Block<E> {
        if (this.left !== undefined) {
            return this.left.min() // tail recursion
        }
        return this.block
    }

    max(): Block<E> {
        if (this.right !== undefined) {
            return this.right.max() // tail recursion
        }
        return this.block
    }

    predecessor(): Block<E> | undefined {
        if (this.left !== undefined) {
            return this.left.max()
        }
        return undefined
    }

    successor(): Block<E> | undefined {
        if (this.right !== undefined) {
            return this.right.min()
        }
        return undefined
    }

    insertMin(iBlock: Block<E>): ValuedNode<E> {
        if (this.left !== undefined) {
            this.setLeft(this.left.insertMin(iBlock))
        } else {
            heavyAssert(
                () => this.block.compare(iBlock) === BlockOrdering.AFTER,
                "iBlock < block"
            )
            this.setLeft(ValuedNode.leaf(iBlock))
        }
        return this.balance()
    }

    insertMax(iBlock: Block<E>): ValuedNode<E> {
        if (this.right !== undefined) {
            this.setRight(this.right.insertMax(iBlock))
        } else {
            heavyAssert(
                () => this.block.compare(iBlock) === BlockOrdering.BEFORE,
                "block < iBlock"
            )
            this.setRight(ValuedNode.leaf(iBlock))
        }
        return this.balance()
    }

    // Anchor
    /** @Override */
    indexFromLeft(anchor: Anchor, minIndex: u32): u32 {
        if (this.left !== undefined) {
            return this.left.indexFrom(anchor, minIndex)
        }
        return minIndex
    }

    /** @Override */
    indexFromRight(anchor: Anchor, minIndex: u32): u32 {
        if (this.right !== undefined) {
            return this.right.indexFrom(anchor, minIndex)
        }
        return minIndex
    }

    /** @Override */
    anchorAtLeft(relIndex: u32, isAfter: boolean): Anchor {
        if (this.left !== undefined) {
            return this.left.anchorAt(relIndex, isAfter)
        }
        return Anchor.BOTTOM
    }

    /** @Override */
    anchorAtRight(relIndex: u32, isAfter: boolean): Anchor {
        if (this.right !== undefined) {
            return this.right.anchorAt(relIndex, isAfter)
        } else if (isAfter) {
            return Anchor.TOP
        } else {
            return this.block.upperAnchor()
        }
    }

    // Insertion
    /** @Override */
    insertableLeft(iBlock: Block<E>): Block<E>[] {
        if (this.left !== undefined) {
            return this.left.insertable(iBlock)
        }
        return [iBlock]
    }

    /** @Override */
    insertableRight(iBlock: Block<E>): Block<E>[] {
        if (this.right !== undefined) {
            return this.right.insertable(iBlock)
        }
        return [iBlock]
    }

    /** @Override */
    insertPredecessor(iBlock: Block<E>): void {
        if (this.left !== undefined) {
            this.setLeft(this.left.insertMax(iBlock))
        } else {
            this.setLeft(ValuedNode.leaf(iBlock))
        }
        // delegate balance to parent
    }

    /** @Override */
    insertSuccessor(iBlock: Block<E>): void {
        if (this.right !== undefined) {
            this.setRight(this.right.insertMin(iBlock))
        } else {
            this.setRight(ValuedNode.leaf(iBlock))
        }
        // delegate balance to parent
    }

    /** @Override */
    insertLeft(iBlock: Block<E>, minIndex: u32): Ins<E>[] {
        let ins
        if (this.left !== undefined) {
            ins = this.left.insert(iBlock, minIndex)
            this.setLeft(this.left.balance())
        } else {
            this.setLeft(ValuedNode.leaf(iBlock))
            ins = [Ins.from(minIndex, iBlock.content)]
        }
        // delegate balance to parent
        return ins
    }

    /** @Override */
    insertRight(iBlock: Block<E>, minIndex: u32): Ins<E>[] {
        let ins
        if (this.right !== undefined) {
            ins = this.right.insert(iBlock, minIndex)
            this.setRight(this.right.balance())
        } else {
            // should not happen
            this.setRight(ValuedNode.leaf(iBlock))
            ins = [Ins.from(minIndex, iBlock.content)]
        }
        // delegate balance to parent
        return ins
    }

    /** @Override */
    insertAtLeft(idx: u32, items: E, f: BlockFactory): Block<E> {
        let ins
        if (this.left !== undefined) {
            ins = this.left.insertAt(idx, items, f)
            this.setLeft(this.left.balance())
        } else {
            // should not happen
            ins = this.insertAt(0, items, f)
        }
        // delegate balance to parent
        return ins
    }

    /** @Override */
    insertAtRight(idx: u32, items: E, f: BlockFactory): Block<E> {
        let ins
        if (this.right !== undefined) {
            ins = this.right.insertAt(idx, items, f)
            this.setRight(this.right.balance())
        } else {
            const lastIdx = this.currentRelativeIndex() + this.block.length
            ins = this.insertAt(lastIdx, items, f)
        }
        // delegate balance to parent
        return ins
    }

    // Removal
    /** @Override */
    removeCurrent(): void {
        this.isSelfRemoved = true
    }

    removeMin(): Node<E> {
        if (this.left !== undefined) {
            this.setLeft(this.left.removeMin())
            return this.balance()
        }
        return this.right
    }

    removeMax(): Node<E> {
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

    /** @Override */
    removeLeft(dBlock: LengthBlock, minIndex: u32): Del[] {
        if (this.left !== undefined) {
            const rmv = this.left.remove(dBlock, minIndex)
            this.setLeft(this.left.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeRight(dBlock: LengthBlock, minIndex: u32): Del[] {
        if (this.right !== undefined) {
            const rmv = this.right.remove(dBlock, minIndex)
            this.setRight(this.right.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeAtLeft(dRange: U32Range, minIndex: u32): LengthBlock[] {
        if (this.left !== undefined) {
            const rmv = this.left.removeAt(dRange, minIndex)
            this.setLeft(this.left.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeAtRight(dRange: U32Range, minIndex: u32): LengthBlock[] {
        if (this.right !== undefined) {
            const rmv = this.right.removeAt(dRange, minIndex)
            this.setRight(this.right.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }
}
