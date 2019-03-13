/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../../util/assert"
import { Block, LengthBlock } from "../../core/block"
import { BlockFactory, BlockFactoryConstructor } from "../../core/block-factory"
import { Concat } from "../../core/concat"
import { Pos } from "../../core/pos"
import { Ins, Del } from "../../core/local-operation"
import { isU32, u32 } from "../../util/number"
import { Sentinel } from "./linked-list-cell"
import {
    OpReplicatedList,
    OpEditableReplicatedList,
} from "../../core/op-replicated-list"
import { FromPlain, isObject } from "../../util/data-validation"

/**
 * An {@see OpReplicatedList } that uses an AVL tree.
 */
export class OpLinkedList<
    P extends Pos<P>,
    E extends Concat<E>
> extends OpReplicatedList<P, E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<P extends Pos<P>, E extends Concat<E>>(): OpLinkedList<P, E> {
        return new OpLinkedList(new Sentinel<P, E>(), 0)
    }

    /**
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        f: BlockFactoryConstructor<P>,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpReplicatedList<P, E>> {
        return (x: unknown) => {
            if (
                isObject<{ root: unknown; length: u32 }>(x) &&
                isU32(x.length)
            ) {
                const blockFromPlain = f.blockFromPlain(itemsFromPlain)
                const root = Sentinel.fromPlain(blockFromPlain)(x.root)
                if (root !== undefined) {
                    return new OpLinkedList(root, x.length)
                }
            }
            return undefined
        }
    }

    /**
     * Chain entry.
     */
    protected readonly root: Sentinel<P, E>

    /** @Override */
    length: u32

    /**
     * New empty list.
     */
    protected constructor(root: Sentinel<P, E>, length: u32) {
        super()
        this.root = root
        this.length = length
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
        return this.root.insertable(delta)
    }

    // Modification
    /** @Override */
    insert(block: Block<P, E>): Ins<E>[] {
        const result = this.root.insert(block, 0)
        this.length = result.reduce((acc, v) => acc + v.length, this.length)
        return result
    }

    /** @Override */
    remove(block: LengthBlock<P>): Del[] {
        const result = this.root.remove(block, 0)
        this.length = result.reduce((acc, v) => acc - v.length, this.length)
        return result
    }
}

/**
 * An {@see EditableOpReplicatedList } that uses an AVL tree.
 */
export class EditableOpLinkedList<P extends Pos<P>, E extends Concat<E>>
    extends OpLinkedList<P, E>
    implements OpEditableReplicatedList<P, E> {
    /**
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        f: BlockFactoryConstructor<P>,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpEditableReplicatedList<P, E>> {
        return (x: unknown) => {
            if (
                isObject<{ root: unknown; factory: unknown; length: u32 }>(x) &&
                isU32(x.length)
            ) {
                const blockFromPlain = f.blockFromPlain(itemsFromPlain)
                const factory = f.fromPlain(x.factory)
                const root = Sentinel.fromPlain(blockFromPlain)(x.root)
                if (root !== undefined && factory !== undefined) {
                    return new EditableOpLinkedList(root, x.length, factory)
                }
            }
            return undefined
        }
    }

    /**
     * @param factory factory of blocks
     * @param v empty value of type E (only used for type inference)
     * @return new empty list.
     */
    static emptyWith<P extends Pos<P>, E extends Concat<E>>(
        factory: BlockFactory<P>
    ): EditableOpLinkedList<P, E> {
        return new EditableOpLinkedList(new Sentinel<P, E>(), 0, factory)
    }

    /**
     * factory of blocks.
     */
    protected readonly factory: BlockFactory<P>

    /**
     * @param factory strategy of block generation.
     */
    protected constructor(
        root: Sentinel<P, E>,
        length: u32,
        factory: BlockFactory<P>
    ) {
        super(root, length)
        this.factory = factory
    }

    /** @Override */
    remove(delta: LengthBlock<P>): Del[] {
        this.factory.garbageCollect(delta)
        return super.remove(delta)
    }

    // Modification
    /** @Override */
    insertAt(index: u32, items: E): Block<P, E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index <= this.length, "valid index")
        assert(() => items.length > 0, "items is not empty")

        const result = this.root.insertAt(index, items, this.factory)
        this.length = this.length + items.length
        return result
    }

    /** @Override */
    removeAt(index: u32, length: u32): LengthBlock<P>[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => index + length <= this.length, "valid end index")

        this.length = this.length - length
        const rmv = this.root.removeAt(index, length)
        if (this.factory.canGarbageCollect()) {
            for (const dBlock of rmv) {
                this.factory.garbageCollect(dBlock)
            }
        }
        return rmv
    }
}
