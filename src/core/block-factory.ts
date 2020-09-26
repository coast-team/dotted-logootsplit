/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../util/assert"
import { FromPlain } from "../util/data-validation"
import { u32 } from "../util/number"
import { Anchor } from "./anchor"
import { Block, BlockOrdering } from "./block"
import { Concat } from "./concat"
import { Pos } from "./pos"

/**
 * Common interface for {@see BlockFactory} constructors.
 */
export interface BlockFactoryConstructor {
    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    readonly fromPlain: FromPlain<BlockFactory>
}

/**
 * Factory of blocks.
 * Implementations can implement different strategies of generation.
 *
 * Implementations should have at least one static function described in
 * {@see BlockFactoryConstructor }.
 */
export abstract class BlockFactory {
    /**
     * @param posBounds bottom and top positions.
     */
    protected constructor(
        posBounds: { BOTTOM: Pos; TOP: Pos },
        replica: u32,
        initialSeq: u32
    ) {
        this.posBounds = posBounds
        this.bottomAnchor = Anchor.from(posBounds.BOTTOM, true)
        this.topAnchor = Anchor.from(posBounds.TOP, false)
        this.replica = replica
        this._seq = initialSeq
    }

    // Factory
    protected readonly posBounds: { BOTTOM: Pos; TOP: Pos }

    /**
     * Lowest Anchor. All generated block are after this anchor.
     */
    readonly bottomAnchor: Anchor

    /**
     * Greatest Anchor. All generated block are before this anchor.
     */
    readonly topAnchor: Anchor

    /**
     * Globally unique identifier of the author of the generated blocks
     * by this factory.
     */
    readonly replica: u32

    /**
     * @see {@link BlockFactory#seq}
     */
    protected _seq: u32

    /**
     * Monotically increasing sequence number.
     * It is locally unique.
     * Seq use in the next generation.
     */
    get seq(): u32 {
        return this._seq
    }

    /**
     * @param items
     * @return New block with {@link items } as {@link Block#items }.
     */
    from<E extends Concat<E>>(items: E): Block<E> {
        return this.between(undefined, items, undefined)
    }

    /**
     * @param l
     * @param items
     * @return New block after {@link l } with {@link items } as
     *  {@link Block#items }.
     */
    after<E extends Concat<E>>(l: Block<E>, items: E): Block<E> {
        return this.between(l, items, undefined)
    }

    /**
     * @param items
     * @param u
     * @return New block before {@link u } with {@link items } as
     *  {@link Block#items }.
     */
    before<E extends Concat<E>>(items: E, u: Block<E>): Block<E> {
        return this.between(undefined, items, u)
    }

    /**
     * @param l
     * @param items
     * @param u
     * @return New block after {@link l } and before {@link u }
     *  with {@link items } as {@link Block#items }.
     */
    between<E extends Concat<E>>(
        l: Block<E> | undefined,
        items: E,
        u: Block<E> | undefined
    ): Block<E> {
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
        const result = new Block(pos, items)
        this._seq = this._seq + result.length
        return result
    }

    // Impl
    /**
     * @param l position lower than all generated positions
     * @param length Number of int-successive positions to generate
     * @param u position greater than all generated positions
     * @return Lower position of the set of int-successive generated positions.
     */
    protected abstract posBetween(l: Pos, length: u32, u: Pos): Pos
}
