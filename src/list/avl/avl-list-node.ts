import { u32, i32 } from "../../util/number"
import { Block, LengthBlock, BlockOrdering } from "../../core/block"
import { Pos } from "../../core/pos"
import { Concat } from "../../core/concat"
import { U32Range } from "../../core/u32-range"
import { Del, Ins } from "../../core/local-operation"
import { heavyAssert } from "../../util/assert"
import { BlockListContext } from "../../core/block-list-context"
import { BlockFactory } from "../../core/block-factory"
import { FromPlain, isObject } from "../../util/data-validation"
import { Anchor } from "../../core/anchor"

export type Node<P extends Pos<P>, E extends Concat<E>> =
    | ValuedNode<P, E>
    | undefined

export function lengthOf<P extends Pos<P>, E extends Concat<E>>(
    node: Node<P, E>
): u32 {
    if (node !== undefined) {
        return node.length
    }
    return 0
}

function rankOf<P extends Pos<P>, E extends Concat<E>>(node: Node<P, E>): u32 {
    if (node !== undefined) {
        return node.rank
    }
    return 0
}

export class ValuedNode<
    P extends Pos<P>,
    E extends Concat<E>
> extends BlockListContext<P, E> {
    static leaf<P extends Pos<P>, E extends Concat<E>>(
        block: Block<P, E>
    ): ValuedNode<P, E> {
        return new ValuedNode(undefined, block, undefined)
    }

    /**
     * @param blockFromPlain
     * @return function that accepts a value and returns a Node from
     *  the value, or undefined if the value is mal-formed
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        blockFromPlain: FromPlain<Block<P, E>>
    ): FromPlain<ValuedNode<P, E>> {
        return (x: unknown) => {
            if (isObject<ValuedNode<P, E>>(x)) {
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

    readonly left: Node<P, E>

    readonly block: Block<P, E>

    protected isSelfRemoved: boolean

    length: u32

    rank: u32

    readonly right: Node<P, E>

    protected constructor(l: Node<P, E>, block: Block<P, E>, r: Node<P, E>) {
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
    setLeft(l: Node<P, E>): void {
        ;(this as { left: Node<P, E> }).left = l
        this.update()
    }

    replace(block: Block<P, E>): void {
        ;(this as { block: Block<P, E> }).block = block
        this.update()
    }

    setRight(r: Node<P, E>): void {
        ;(this as { right: Node<P, E> }).right = r
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

    isRightUnbalanced(): this is this & { right: ValuedNode<P, E> } {
        return this.balanceFactor() >= 2
    }

    isRightOriented(): this is this & { right: ValuedNode<P, E> } {
        return this.balanceFactor() === 1
    }

    isLeftOriented(): this is this & { left: ValuedNode<P, E> } {
        return this.balanceFactor() <= -2
    }

    isSlighlyLeftUnbalanced(): this is this & { left: ValuedNode<P, E> } {
        return this.balanceFactor() === -1
    }

    rotateLeft(this: this & { right: ValuedNode<P, E> }): ValuedNode<P, E> {
        const r = this.right
        this.setRight(r.left)
        r.setLeft(this)
        return r
    }

    rotateRight(this: this & { left: ValuedNode<P, E> }): ValuedNode<P, E> {
        const l = this.left
        this.setLeft(l.right)
        l.setRight(this)
        return l
    }

    balance(): ValuedNode<P, E> {
        let self: ValuedNode<P, E> = this
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
    updated(): Node<P, E> {
        if (this.isSelfRemoved) {
            return undefined
        }
        return this.balance()
    }

    // Traversal
    reduceBlock<U>(f: (acc: U, b: Block<P, E>) => U, prefix: U): U {
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
    current(): Block<P, E> {
        return this.block
    }

    currentRelativeIndex(): u32 {
        return lengthOf(this.left)
    }

    min(): Block<P, E> {
        if (this.left !== undefined) {
            return this.left.min() // tail recursion
        }
        return this.block
    }

    max(): Block<P, E> {
        if (this.right !== undefined) {
            return this.right.max() // tail recursion
        }
        return this.block
    }

    predecessor(): Block<P, E> | undefined {
        if (this.left !== undefined) {
            return this.left.max()
        }
        return undefined
    }

    successor(): Block<P, E> | undefined {
        if (this.right !== undefined) {
            return this.right.min()
        }
        return undefined
    }

    insertMin(iBlock: Block<P, E>): ValuedNode<P, E> {
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

    insertMax(iBlock: Block<P, E>): ValuedNode<P, E> {
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
    indexFromLeft(anchor: Anchor<P>, minIndex: u32): u32 {
        if (this.left !== undefined) {
            return this.left.indexFrom(anchor, minIndex)
        }
        return minIndex
    }

    /** @Override */
    indexFromRight(anchor: Anchor<P>, minIndex: u32): u32 {
        if (this.right !== undefined) {
            return this.right.indexFrom(anchor, minIndex)
        }
        return minIndex
    }

    /** @Override */
    anchorAtLeft(
        relIndex: u32,
        isAfter: boolean,
        f: BlockFactory<P>
    ): Anchor<P> {
        if (this.left !== undefined) {
            return this.left.anchorAt(relIndex, isAfter, f)
        }
        return f.bottomAnchor
    }

    /** @Override */
    anchorAtRight(
        relIndex: u32,
        isAfter: boolean,
        f: BlockFactory<P>
    ): Anchor<P> {
        if (this.right !== undefined) {
            return this.right.anchorAt(relIndex, isAfter, f)
        } else if (isAfter) {
            return f.topAnchor
        } else {
            return this.block.upperAnchor()
        }
    }

    // Insertion
    /** @Override */
    insertableLeft(iBlock: Block<P, E>): Block<P, E>[] {
        if (this.left !== undefined) {
            return this.left.insertable(iBlock)
        }
        return [iBlock]
    }

    /** @Override */
    insertableRight(iBlock: Block<P, E>): Block<P, E>[] {
        if (this.right !== undefined) {
            return this.right.insertable(iBlock)
        }
        return [iBlock]
    }

    /** @Override */
    insertPredecessor(iBlock: Block<P, E>): void {
        if (this.left !== undefined) {
            this.setLeft(this.left.insertMax(iBlock))
        } else {
            this.setLeft(ValuedNode.leaf(iBlock))
        }
        // delegate balance to parent
    }

    /** @Override */
    insertSuccessor(iBlock: Block<P, E>): void {
        if (this.right !== undefined) {
            this.setRight(this.right.insertMin(iBlock))
        } else {
            this.setRight(ValuedNode.leaf(iBlock))
        }
        // delegate balance to parent
    }

    /** @Override */
    insertLeft(iBlock: Block<P, E>, minIndex: u32): Ins<E>[] {
        let ins
        if (this.left !== undefined) {
            ins = this.left.insert(iBlock, minIndex)
            this.setLeft(this.left.balance())
        } else {
            this.setLeft(ValuedNode.leaf(iBlock))
            ins = [new Ins(minIndex, iBlock.content)]
        }
        // delegate balance to parent
        return ins
    }

    /** @Override */
    insertRight(iBlock: Block<P, E>, minIndex: u32): Ins<E>[] {
        let ins
        if (this.right !== undefined) {
            ins = this.right.insert(iBlock, minIndex)
            this.setRight(this.right.balance())
        } else {
            // should not happen
            this.setRight(ValuedNode.leaf(iBlock))
            ins = [new Ins(minIndex, iBlock.content)]
        }
        // delegate balance to parent
        return ins
    }

    /** @Override */
    insertAtLeft(idx: u32, items: E, f: BlockFactory<P>): Block<P, E> {
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
    insertAtRight(idx: u32, items: E, f: BlockFactory<P>): Block<P, E> {
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

    removeMin(): Node<P, E> {
        if (this.left !== undefined) {
            this.setLeft(this.left.removeMin())
            return this.balance()
        }
        return this.right
    }

    removeMax(): Node<P, E> {
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
    removeLeft(dBlock: LengthBlock<P>, minIndex: u32): Del[] {
        if (this.left !== undefined) {
            const rmv = this.left.remove(dBlock, minIndex)
            this.setLeft(this.left.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeRight(dBlock: LengthBlock<P>, minIndex: u32): Del[] {
        if (this.right !== undefined) {
            const rmv = this.right.remove(dBlock, minIndex)
            this.setRight(this.right.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeAtLeft(dRange: U32Range, minIndex: u32): LengthBlock<P>[] {
        if (this.left !== undefined) {
            const rmv = this.left.removeAt(dRange, minIndex)
            this.setLeft(this.left.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }

    /** @Override */
    removeAtRight(dRange: U32Range, minIndex: u32): LengthBlock<P>[] {
        if (this.right !== undefined) {
            const rmv = this.right.removeAt(dRange, minIndex)
            this.setRight(this.right.updated())
            // delegate balance to parent
            return rmv
        }
        return []
    }
}
