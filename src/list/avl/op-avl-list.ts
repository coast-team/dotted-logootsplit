import { Pos } from "../../core/pos"
import { Concat } from "../../core/concat"
import {
    OpReplicatedList,
    EditableOpReplicatedList,
} from "../../core/op-replicated-list"
import { Node, ValuedNode, lengthOf } from "./avl-list-node"
import { u32, isU32 } from "../../util/number"
import { Block, LengthBlock } from "../../core/block"
import { Ins, Del } from "../../core/local-operation"
import { BlockFactory, BlockFactoryConstructor } from "../../core/block-factory"
import { assert } from "../../util/assert"
import { U32Range } from "../../core/u32-range"
import { FromPlain, isObject } from "../../util/data-validation"

/**
 * An {@see OpReplicatedList } that uses an AVL tree.
 */
export class OpAvlList<
    P extends Pos<P>,
    E extends Concat<E>
> extends OpReplicatedList<P, E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<P extends Pos<P>, E extends Concat<E>>(): OpAvlList<P, E> {
        return new OpAvlList(undefined)
    }

    /**
     *
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        f: BlockFactoryConstructor<P>,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpAvlList<P, E>> {
        return (x: unknown) => {
            if (isObject<{ root: unknown }>(x)) {
                const blockFromPlain = f.blockFromPlain(itemsFromPlain)
                const root = ValuedNode.fromPlain(blockFromPlain)(x.root)
                return new OpAvlList(root)
            }
            return undefined
        }
    }

    /**
     * AVL root.
     */
    protected root: Node<P, E>

    /**
     * @param root {@see EditableOpAvlList#root }
     */
    protected constructor(root: Node<P, E>) {
        super()
        this.root = root
    }

    /** @Override */
    get length(): u32 {
        return lengthOf(this.root)
    }

    /** @Override */
    reduceBlock<U>(f: (acc: U, b: Block<P, E>) => U, prefix: U): U {
        if (this.root !== undefined) {
            return this.root.reduceBlock(f, prefix)
        }
        return prefix
    }

    /** @Override */
    insertable(delta: Block<P, E>): Block<P, E>[] {
        if (this.root !== undefined) {
            return this.root.insertable(delta)
        }
        return []
    }

    // Modification
    /** @Override */
    insert(delta: Block<P, E>): Ins<E>[] {
        if (this.root !== undefined) {
            const ins = this.root.insert(delta, 0)
            this.root = this.root.balance()
            return ins
        } else {
            this.root = ValuedNode.leaf(delta)
            return [new Ins(0, delta.content)]
        }
    }

    /** @Override */
    remove(delta: LengthBlock<P>): Del[] {
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
export class EditableOpAvlList<P extends Pos<P>, E extends Concat<E>>
    extends OpAvlList<P, E>
    implements EditableOpReplicatedList<P, E> {
    /**
     * @param factory factory of blocks
     * @param v empty value of type E (only used for type inference)
     * @return new empty list.
     */
    static emptyWith<P extends Pos<P>, E extends Concat<E>>(
        factory: BlockFactory<P>
    ): EditableOpAvlList<P, E> {
        return new EditableOpAvlList(undefined, factory)
    }

    /**
     *
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        f: BlockFactoryConstructor<P>,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<EditableOpAvlList<P, E>> {
        return (x: unknown) => {
            if (isObject<{ root: unknown; factory: unknown }>(x)) {
                const factory = f.fromPlain(x.factory)
                if (factory !== undefined) {
                    const blockFromPlain = f.blockFromPlain(itemsFromPlain)
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
    protected readonly factory: BlockFactory<P>

    /**
     * @param root {@see EditableOpAvlList#root }
     * @param factory {@see EditableOpAvlList#factory }
     */
    protected constructor(root: Node<P, E>, factory: BlockFactory<P>) {
        super(root)
        this.factory = factory
    }

    /** @Override */
    remove(delta: LengthBlock<P>): Del[] {
        this.factory.garbageCollect(delta)
        return super.remove(delta)
    }

    /** @Override */
    insertAt(index: u32, items: E): Block<P, E> {
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
    removeAt(index: u32, length: u32): LengthBlock<P>[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index < this.length, "valid index")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => index + length <= this.length, "valid end index")

        if (this.root !== undefined) {
            const indexRange = U32Range.fromLength(index, length)
            const rmv = this.root.removeAt(indexRange, 0)
            this.root = this.root.updated()
            if (this.factory.canGarbageCollect()) {
                for (const dBlock of rmv) {
                    this.factory.garbageCollect(dBlock)
                }
            }
            return rmv
        }
        return []
    }
}
