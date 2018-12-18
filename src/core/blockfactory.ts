/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "./assert"
import { Block, BlockOrdering } from "./block"
import { Concat } from "./concat"
import { Pos } from "./pos"
import { uint32 } from "../core/number"
import { Anchor } from "./anchor"

/**
 * Factory of blocks.
 * Implementations can implement different strategies of generation.
 */
export abstract class BlockFactory <P extends Pos<P>> {
    /**
     * @param posBounds bottom and top positions.
     */
    constructor (protected readonly posBounds: {BOTTOM: P, TOP: P}) {
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
    readonly abstract replica: uint32

    /**
     * Monotically increasing sequence number.
     * It is locally unique.
     * Seq use in the next generation.
     */
    readonly abstract seq: uint32

    /**
     * @param items
     * @return New block with {@link items } as {@link Block#items }.
     */
    from <E extends Concat<E>> (items: E): [Block<P, E>, BlockFactory<P>] {
        assert(() => items.length > 0, "items.length > 0")
        const [pos, factory] =
            this.posBetween(this.posBounds.BOTTOM, items.length, this.posBounds.TOP)
        return [new Block(pos, items), factory]
    }

    /**
     * @param l
     * @param items
     * @return New block after {@link l } with {@link items } as
     *  {@link Block#items }.
     */
    after <E extends Concat<E>> (l: Block<P, E>, items: E): [Block<P, E>, BlockFactory<P>] {
        assert(() => items.length > 0, "items.length > 0")
        const [pos, factory] =
            this.posBetween(l.upperPos(), items.length, this.posBounds.TOP)
        return [new Block(pos, items), factory]
    }

    /**
     * @param items
     * @param u
     * @return New block before {@link u } with {@link items } as
     *  {@link Block#items }.
     */
    before <E extends Concat<E>> (items: E, u: Block<P, E>): [Block<P, E>, BlockFactory<P>] {
        assert(() => items.length > 0, "items.length > 0")
        const [pos, factory] =
            this.posBetween(this.posBounds.BOTTOM, items.length, u.lowerPosition)
        return [new Block(pos, items), factory]
    }

    /**
     * @param l
     * @param items
     * @param u
     * @return New block after {@link l } and before {@link u }
     *  with {@link items } as {@link Block#items }.
     */
    between <E extends Concat<E>> (l: Block<P, E>, items: E, u: Block<P, E>): [Block<P, E>, BlockFactory<P>] {
        assert(() => items.length > 0, "items.length > 0")
        heavyAssert(() => l.compare(u) <= BlockOrdering.PREPENDABLE, "l < u")
        const [pos, factory] =
            this.posBetween(l.upperPos(), items.length, u.lowerPosition)
        return [new Block(pos, items), factory]
    }

// Impl
    /**
     * @param l position lower than all generated positions
     * @param length Number of int-successive positions to generate
     * @param u position greater than all generated positions
     * @return Lower position of the set of int-successive generated positions.
     */
    protected abstract posBetween (l: P, length: uint32, u: P): [P, BlockFactory<P>]
}
