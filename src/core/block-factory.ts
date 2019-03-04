/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../util/assert"
import { Block, BlockOrdering, LengthBlock } from "./block"
import { Concat } from "./concat"
import { Pos } from "./pos"
import { u32 } from "../util/number"
import { Anchor } from "./anchor"
import { FromPlain } from "../util/data-validation"

/**
 * Common interface for {@see BlockFactory} constructors.
 */
export interface BlockFactoryConstructor<P extends Pos<P>> {
    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    readonly fromPlain: FromPlain<BlockFactory<P>>

    /**
     * @param itemsFromPlain
     * @return function that accepts a value and attempt to build a block.
     *  It returns the built block if it succeeds, or undefined if it fails.
     */
    readonly blockFromPlain: <E extends Concat<E>>(
        itemsFromPlain: FromPlain<E>
    ) => FromPlain<Block<P, E>>
}

/**
 * Factory of blocks.
 * Implementations can implement different strategies of generation.
 *
 * Implementations should have at least two static function described in
 * {@see BlockFactoryConstructor }.
 */
export abstract class BlockFactory<P extends Pos<P>> {
    /**
     * @param posBounds bottom and top positions.
     */
    protected constructor(protected readonly posBounds: { BOTTOM: P; TOP: P }) {
        this.topAnchor = new Anchor(posBounds.TOP)
    }

    // Factory
    /**
     * Greatest Anchor. All generated block are before this anchor.
     */
    readonly topAnchor: Anchor<P>

    /**
     * Globally unique identifier of the author of the generated blocks
     * by this factory.
     */
    abstract readonly replica: u32

    /**
     * Monotically increasing sequence number.
     * It is locally unique.
     * Seq use in the next generation.
     */
    abstract readonly seq: u32

    /**
     * @param items
     * @return New block with {@link items } as {@link Block#items }.
     */
    from<E extends Concat<E>>(items: E): Block<P, E> {
        assert(() => items.length > 0, "items.length > 0")
        const pos = this.posBetween(
            this.posBounds.BOTTOM,
            items.length,
            this.posBounds.TOP
        )
        return new Block(pos, items)
    }

    /**
     * @param l
     * @param items
     * @return New block after {@link l } with {@link items } as
     *  {@link Block#items }.
     */
    after<E extends Concat<E>>(l: Block<P, E>, items: E): Block<P, E> {
        assert(() => items.length > 0, "items.length > 0")
        const pos = this.posBetween(
            l.upperPos(),
            items.length,
            this.posBounds.TOP
        )
        return new Block(pos, items)
    }

    /**
     * @param items
     * @param u
     * @return New block before {@link u } with {@link items } as
     *  {@link Block#items }.
     */
    before<E extends Concat<E>>(items: E, u: Block<P, E>): Block<P, E> {
        assert(() => items.length > 0, "items.length > 0")
        const pos = this.posBetween(
            this.posBounds.BOTTOM,
            items.length,
            u.lowerPos
        )
        return new Block(pos, items)
    }

    /**
     * @param l
     * @param items
     * @param u
     * @return New block after {@link l } and before {@link u }
     *  with {@link items } as {@link Block#items }.
     */
    between<E extends Concat<E>>(
        l: Block<P, E> | undefined,
        items: E,
        u: Block<P, E> | undefined
    ): Block<P, E> {
        assert(() => items.length > 0, "items.length > 0")
        heavyAssert(
            () =>
                l === undefined ||
                u === undefined ||
                l.compare(u) <= BlockOrdering.PREPENDABLE,
            "l < u"
        )
        const lPos = l !== undefined ? l.upperPos() : this.posBounds.BOTTOM
        const uPos = u !== undefined ? u.lowerPos : this.posBounds.TOP
        const pos = this.posBetween(lPos, items.length, uPos)
        return new Block(pos, items)
    }

    /**
     * See {@link BlockFactory#garbageCollect }
     *
     * @param dBlock
     * @return Is there stored positions in this factory?
     */
    canGarbageCollect(): boolean {
        return (
            this.garbageCollectPos !== BlockFactory.prototype.garbageCollectPos
        )
    }

    /**
     * Some factories can store generated positions for differents purposes.
     * This method enables to garbage collect these positions when they
     * are removed from the main data structure.
     *
     * @param dBlock
     */
    garbageCollect(dBlock: LengthBlock<P>): void {
        this.garbageCollectPos(dBlock.lowerPos, dBlock.length)
    }

    /**
     * See {@link BlockFactory#garbageCollect }
     *
     * @param l lower position
     * @param length number of positions after l (including l) to remove
     */
    protected garbageCollectPos(l: P, length: u32): void {}

    // Impl
    /**
     * @param l position lower than all generated positions
     * @param length Number of int-successive positions to generate
     * @param u position greater than all generated positions
     * @return Lower position of the set of int-successive generated positions.
     */
    protected abstract posBetween(l: P, length: u32, u: P): P
}
