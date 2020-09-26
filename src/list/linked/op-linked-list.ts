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
import { isU32, u32 } from "../../util/number"
import { Sentinel } from "./linked-list-cell"
import {
    OpReplicatedList,
    OpEditableReplicatedList,
} from "../../core/op-replicated-list"
import { FromPlain, isObject } from "../../util/data-validation"
import { Anchor } from "../../core/anchor"
import { Ins } from "../../core/ins"
import { Del } from "../../core/del"

/**
 * An {@see OpReplicatedList } that uses an AVL tree.
 */
export class OpLinkedList<E extends Concat<E>> extends OpReplicatedList<E> {
    /**
     * @param v empty value of type E
     * @return new empty list.
     */
    static empty<E extends Concat<E>>(): OpLinkedList<E> {
        return new OpLinkedList(new Sentinel<E>(), 0)
    }

    /**
     * @param f
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a list.
     *  It returns the built list if it succeeds, or undefined if it fails.
     */
    static fromPlain<E extends Concat<E>>(
        f: BlockFactoryConstructor,
        itemsFromPlain: FromPlain<E>
    ): FromPlain<OpReplicatedList<E>> {
        return (x: unknown) => {
            if (
                isObject<{ root: unknown; length: u32 }>(x) &&
                isU32(x.length)
            ) {
                const blockFromPlain = Block.fromPlain(itemsFromPlain)
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
    protected readonly root: Sentinel<E>

    /** @Override */
    length: u32

    /**
     * New empty list.
     */
    protected constructor(root: Sentinel<E>, length: u32) {
        super()
        this.root = root
        this.length = length
    }

    /** @Override */
    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        if (this.root !== undefined) {
            return this.root.reduceBlock(f, prefix)
        }
        return prefix
    }

    /** @Override */
    anchorAt(index: u32, isAfter: boolean): Anchor {
        assert(() => isU32(index), "index ∈ u32")
        return this.root.anchorAt(index, isAfter)
    }

    /** @Override */
    indexFrom(anchor: Anchor): u32 {
        return this.root.indexFrom(anchor, 0)
    }

    /** @Override */
    insertable(delta: Block<E>): Block<E>[] {
        return this.root.insertable(delta)
    }

    // Modification
    /** @Override */
    insert(block: Block<E>): Ins<E>[] {
        const result = this.root.insert(block, 0)
        this.length = result.reduce(
            (acc, v) => acc + v.content.length,
            this.length
        )
        return result
    }

    /** @Override */
    remove(block: LengthBlock): Del[] {
        const result = this.root.remove(block, 0)
        this.length = result.reduce((acc, v) => acc - v.length, this.length)
        return result
    }
}

/**
 * An {@see EditableOpReplicatedList } that uses an AVL tree.
 */
export class EditableOpLinkedList<E extends Concat<E>>
    extends OpLinkedList<E>
    implements OpEditableReplicatedList<E> {
    /**
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
            if (
                isObject<{ root: unknown; factory: unknown; length: u32 }>(x) &&
                isU32(x.length)
            ) {
                const blockFromPlain = Block.fromPlain(itemsFromPlain)
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
    static emptyWith<E extends Concat<E>>(
        factory: BlockFactory
    ): EditableOpLinkedList<E> {
        return new EditableOpLinkedList(new Sentinel<E>(), 0, factory)
    }

    /**
     * factory of blocks.
     */
    protected readonly factory: BlockFactory

    /**
     * @param factory strategy of block generation.
     */
    protected constructor(
        root: Sentinel<E>,
        length: u32,
        factory: BlockFactory
    ) {
        super(root, length)
        this.factory = factory
    }

    /** @Override */
    remove(delta: LengthBlock): Del[] {
        return super.remove(delta)
    }

    // Modification
    /** @Override */
    insertAt(index: u32, items: E): Block<E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => index <= this.length, "valid index")
        assert(() => items.length > 0, "items is not empty")

        const result = this.root.insertAt(index, items, this.factory)
        this.length = this.length + items.length
        return result
    }

    /** @Override */
    removeAt(index: u32, length: u32): LengthBlock[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => index + length <= this.length, "valid end index")

        this.length = this.length - length
        return this.root.removeAt(index, length)
    }
}
