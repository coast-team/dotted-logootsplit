import { Concat } from "../../core/concat"
import {
    OpReplicatedList,
    OpEditableReplicatedList,
} from "../../core/op-replicated-list"
import { Node, ValuedNode, lengthOf } from "./avl-list-node"
import { u32, isU32 } from "../../util/number"
import { Block, LengthBlock } from "../../core/block"
import { BlockFactory, BlockFactoryConstructor } from "../../core/block-factory"
import { assert } from "../../util/assert"
import { U32Range } from "../../core/u32-range"
import { FromPlain, isObject } from "../../util/data-validation"
import { Anchor } from "../../core/anchor"
import { Ins } from "../../core/ins"
import { Del } from "../../core/del"

/**
 * An {@see OpReplicatedList } that uses an AVL tree.
 */
export class OpAvlList<E extends Concat<E>> extends OpReplicatedList<E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<E extends Concat<E>>(): OpAvlList<E> {
        return new OpAvlList(undefined)
    }

    /**
     * @param blockFromPlain
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<E extends Concat<E>>(
        f: BlockFactoryConstructor,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpReplicatedList<E>> {
        return (x: unknown) => {
            if (isObject<{ root: unknown }>(x)) {
                const root = ValuedNode.fromPlain(
                    Block.fromPlain(itemsFromPlain)
                )(x.root)
                return new OpAvlList(root)
            }
            return undefined
        }
    }

    /**
     * AVL root.
     */
    protected root: Node<E>

    /**
     * @param root {@see EditableOpAvlList#root }
     */
    protected constructor(root: Node<E>) {
        super()
        this.root = root
    }

    /** @Override */
    get length(): u32 {
        return lengthOf(this.root)
    }

    /** @Override */
    anchorAt(index: u32, isAfter: boolean): Anchor {
        assert(() => isU32(index), "index ∈ u32")

        if (this.root !== undefined) {
            return this.root.anchorAt(index, isAfter)
        } else if (isAfter) {
            return Anchor.TOP
        } else {
            return Anchor.BOTTOM
        }
    }

    /** @Override */
    indexFrom(anchor: Anchor): u32 {
        if (this.root !== undefined) {
            return this.root.indexFrom(anchor, 0)
        } else {
            return 0
        }
    }

    /** @Override */
    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        if (this.root !== undefined) {
            return this.root.reduceBlock(f, prefix)
        }
        return prefix
    }

    /** @Override */
    insertable(delta: Block<E>): Block<E>[] {
        if (this.root !== undefined) {
            return this.root.insertable(delta)
        }
        return []
    }

    // Modification
    /** @Override */
    insert(delta: Block<E>): Ins<E>[] {
        if (this.root !== undefined) {
            const ins = this.root.insert(delta, 0)
            this.root = this.root.balance()
            return ins
        } else {
            this.root = ValuedNode.leaf(delta)
            return [Ins.from(0, delta.content)]
        }
    }

    /** @Override */
    remove(delta: LengthBlock): Del[] {
        if (this.root !== undefined) {
            const rmv = this.root.remove(delta, 0)
            this.root = this.root.updated()
            return rmv
        }
        return []
    }
}

/**
 * An {@see EditableOpReplicatedList } that uses an AVL tree.
 */
export class EditableOpAvlList<E extends Concat<E>>
    extends OpAvlList<E>
    implements OpEditableReplicatedList<E> {
    /**
     * @param factory factory of blocks
     * @param v empty value of type E (only used for type inference)
     * @return new empty list.
     */
    static emptyWith<E extends Concat<E>>(
        factory: BlockFactory
    ): EditableOpAvlList<E> {
        return new EditableOpAvlList(undefined, factory)
    }

    /**
     *
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<E extends Concat<E>>(
        f: BlockFactoryConstructor,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpEditableReplicatedList<E>> {
        return (x: unknown) => {
            if (isObject<{ root: unknown; factory: unknown }>(x)) {
                const factory = f.fromPlain(x.factory)
                if (factory !== undefined) {
                    const blockFromPlain = Block.fromPlain(itemsFromPlain)
                    const root = ValuedNode.fromPlain(blockFromPlain)(x.root)
                    return new EditableOpAvlList(root, factory)
                }
            }
            return undefined
        }
    }

    /**
     * factory of blocks.
     */
    protected readonly factory: BlockFactory

    /**
     * @param root {@see EditableOpAvlList#root }
     * @param factory {@see EditableOpAvlList#factory }
     */
    protected constructor(root: Node<E>, factory: BlockFactory) {
        super(root)
        this.factory = factory
    }

    /** @Override */
    remove(delta: LengthBlock): Del[] {
        return super.remove(delta)
    }

    /** @Override */
    insertAt(index: u32, items: E): Block<E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index <= this.length, "valid index")
        assert(() => items.length > 0, "items is not empty")

        if (this.root !== undefined) {
            const iBlock = this.root.insertAt(index, items, this.factory)
            this.root = this.root.balance()
            return iBlock
        } else {
            const iBlock = this.factory.from(items)
            this.root = ValuedNode.leaf(iBlock)
            return iBlock
        }
    }

    /** @Override */
    removeAt(index: u32, length: u32): LengthBlock[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index < this.length, "valid index")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => index + length <= this.length, "valid end index")

        if (this.root !== undefined) {
            const indexRange = U32Range.fromLength(index, length)
            const rmv = this.root.removeAt(indexRange, 0)
            this.root = this.root.updated()
            return rmv
        }
        return []
    }
}
