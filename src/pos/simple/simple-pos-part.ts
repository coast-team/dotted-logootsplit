/*
    Copyright (C) 2019  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../../util/assert"
import { isObject } from "../../util/data-validation"
import {
    compareU32,
    digestOf,
    isU32,
    u32,
    U32_BOTTOM,
    U32_TOP,
} from "../../util/number"
import { lexCompareOrdering, Ordering } from "../../util/ordering"

/**
 * @final this class cannot be extended
 *
 * Part of a {@link SimplePos}.
 *
 * A part is a lexicographic quadruple (priority, replica, nth, offset).
 * The triplet (replica, nth, offset) uniquely identifies a part.
 */
export class SimplePosPart {
    /**
     * Lowest part.
     * Here the triplet (replica, nth, offset) has no meaning.
     */
    static readonly BOTTOM = new SimplePosPart(U32_BOTTOM, U32_TOP, 0, 0)

    /**
     * Greatest part.
     * Here the triplet (replica, nth, offset) has no meaning.
     */
    static readonly TOP = new SimplePosPart(U32_TOP, U32_TOP, 1, 0)

    /**
     * @param priority {@link SimplePosPart#priority }
     *      ∉ {U32_BOTTOM, U32_TOP}
     * @param replica {@link SimplePosPart#replica }
     *      !== U32_TOP
     * @param nth {@link SimplePosPart#nth }
     * @param offset {@link SimplePosPart#offset }
     */
    static from(
        priority: u32,
        replica: u32,
        nth: u32,
        offset: u32
    ): SimplePosPart {
        assert(
            () => priority !== U32_BOTTOM && priority !== U32_TOP,
            "priority ∉ {U32_BOTTOM, U32_TOP}"
        )
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP."
        )
        return new SimplePosPart(priority, replica, nth, offset)
    }

    /**
     * @note {@link SimplePosPart#BOTTOM} and {@link SimplePosPart#TOP}
     * are not valid candidates.
     *
     * @param x candidate
     * @return object from `x`, or undefined if `x` is not valid.
     */
    static fromPlain(x: unknown): SimplePosPart | undefined {
        if (
            isObject<SimplePosPart>(x) &&
            isU32(x.priority) &&
            isU32(x.replica) &&
            isU32(x.nth) &&
            isU32(x.offset)
        ) {
            return new SimplePosPart(x.priority, x.replica, x.nth, x.offset)
        }
        return undefined
    }

    /**
     * Priority of the part over another one.
     * If two parts have the same priority, the lexicographic pair
     * (replica, nth) is used as disambiguator.
     */
    readonly priority: u32

    /**
     * Globally unique identifier of the author which generated this part.
     */
    readonly replica: u32

    /**
     * Each part is generated for the `nth` generated block.
     */
    readonly nth: u32

    /**
     * Offset in the block.
     */
    readonly offset: u32

    /**
     * @param priority {@link SimplePosPart#priority }
     * @param replica {@link SimplePosPart#replica }
     * @param nth {@link SimplePosPart#nth }
     * @param offset {@link SimplePosPart#offset }
     */
    private constructor(priority: u32, replica: u32, nth: u32, offset: u32) {
        assert(() => isU32(priority), "random ∈ u32")
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => isU32(nth), "nth ∈ u32")
        assert(() => isU32(offset), "offset ∈ u32")
        this.priority = priority
        this.replica = replica
        this.nth = nth
        this.offset = offset
    }

    // Derivation
    /**
     * @param offset The offset of the new SimplePosPart
     * @return part with the same base, but with a different offset
     */
    withOffset(offset: u32): SimplePosPart {
        assert(() => isU32(offset), "offset ∈ u32")
        return new SimplePosPart(this.priority, this.replica, this.nth, offset)
    }

    // Access
    /**
     * @return [priority, replica, nth, offset]
     */
    asTuple(): [u32, u32, u32, u32] {
        return [this.priority, this.replica, this.nth, this.offset]
    }

    /**
     * Hash code
     */
    digest(): u32 {
        return digestOf(this.asTuple())
    }

    // Status
    /**
     * @example
     * SimplePosPart(0, 0, 0, _) == SimplePosPart(0, 0, 0, _)
     * SimplePosPart(0, 0, 0, _) < SimplePosPart(1, 0, 0, _)
     * SimplePosPart(1, 0, 0, _) < SimplePosPart(1, 1, 0, _)
     * SimplePosPart(1, 1, 0, _) < SimplePosPart(1, 1, 1, _)
     *
     * Lexicographic order of triplet (priority, replica, nth).
     *
     * @param other
     * @return `this` [Order relation] `other` regardless their offsets
     *  ({@link SimplePosPart#offset})
     */
    compareBase(other: SimplePosPart): Ordering {
        return lexCompareOrdering(
            compareU32(this.priority, other.priority),
            lexCompareOrdering(
                compareU32(this.replica, other.replica),
                compareU32(this.nth, other.nth)
            )
        )
    }

    /**
     * @example
     * SimplePosPart(0, 0, 0, 0) < SimplePosPart(1, 0, 0, 0)
     * SimplePosPart(1, 0, 0, 0) < SimplePosPart(1, 1, 0, 0)
     * SimplePosPart(1, 1, 0, 0) < SimplePosPart(1, 1, 1, 0)
     * SimplePosPart(1, 1, 1, 0) < SimplePosPart(1, 1, 1, 1)
     *
     * Lexicographic order of quadruple (priority, replica, nth, offset).
     *
     * @param other
     * @return `this` [Order relation] `other`
     */
    compare(other: SimplePosPart): Ordering {
        if (this === other) {
            return Ordering.EQUAL
        } else {
            return lexCompareOrdering(
                this.compareBase(other),
                compareU32(this.offset, other.offset)
            )
        }
    }
}
