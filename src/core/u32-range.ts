/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../util/assert"
import { isU32, u32 } from "../util/number"
import { isObject } from "../util/data-validation"

/**
 * Possible order relation between two intervals.
 *
 * @example
 * [0, 2] < [4, 6]
 * [0, 2] <: [3, 6]
 * [0, 4] <∩ [4, 6] (because their intersection is not empty)
 * [0, 2] -⊂ [0, 3]
 * [1, 2] ⊂ [0, 3]
 * [2, 3] +⊂ [0, 3]
 * [0, 2] = [0, 2]
 */
export const enum RangeOrdering {
    BEFORE = -6, // <
    PREPENDABLE = -5, // <:
    OVERLAPPING_BEFORE = -4, // <∩
    INCLUDED_LEFT_BY = -3, // -⊂
    INCLUDED_MIDDLE_BY = -2, // ⊂
    INCLUDED_RIGHT_BY = -1, // +⊂
    EQUAL = 0, // =
    INCLUDING_LEFT = 1, // ⊃-
    INCLUDING_MIDDLE = 2, // ⊃
    INCLUDING_RIGHT = 3, // ⊃+
    OVERLAPPING_AFTER = 4, // >∩
    APPENDABLE = 5, // :>
    AFTER = 6, // >
}

/**
 * Interval of u32.
 */
export class U32Range {
    /**
     * @param lower Lower bound.
     * @param length Number of elements in the range.
     */
    protected constructor(readonly lower: u32, readonly length: u32) {}

    /**
     * @param lower {@link IntInterval#lower }
     * @param length {@link IntInterval#length }
     * @return New range.
     */
    static fromLength(lower: u32, length: u32): U32Range {
        assert(() => isU32(lower), "lower ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length > 0")
        //assert(() => isu32(lower + length))
        return new U32Range(lower, length)
    }

    /**
     * @param lower {@link IntInterval#lower }
     * @param upper {@link IntInterval#length }
     * @return New range.
     */
    static fromBounds(lower: u32, upper: u32): U32Range {
        assert(() => isU32(lower), "lower ∈ u32")
        assert(() => isU32(upper), "upper ∈ u32")
        assert(() => lower <= upper, "lower <= upper")
        return U32Range.fromLength(lower, upper - lower + 1)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): U32Range | undefined {
        if (
            isObject<U32Range>(x) &&
            isU32(x.lower) &&
            isU32(x.length) &&
            x.length > 0
        ) {
            return new U32Range(x.lower, x.length)
        }
        return undefined
    }

    // Access
    /**
     * @example
     * nth(0) == lower
     * nth(length - 1) == upper
     *
     * @param nth 0-based
     * @return n-th element.
     */
    nth(nth: u32): u32 {
        assert(() => isU32(nth), "nth ∈ u32")
        assert(() => nth < this.length, "valid nth")
        assert(() => isU32(this.lower + nth), "No integer overflow")
        return this.lower + nth
    }

    /**
     * Upper bound.
     */
    upper(): u32 {
        return this.nth(this.length - 1)
    }

    // Derivation
    /**
     * @param other
     * @return {@link other } appended to this.
     */
    append(other: U32Range): U32Range {
        heavyAssert(
            () => other.compare(this) === RangeOrdering.APPENDABLE,
            "other is appendable to this"
        )
        return new U32Range(this.lower, this.length + other.length)
    }

    /**
     * @param other
     *      this includes or overlaps after {@link other }
     * @return Part of this block which can be append to {@link block }.
     */
    appendable(other: U32Range): U32Range {
        heavyAssert(
            () => this.hasAppendable(other),
            "this has an appendable segment to other"
        )
        return U32Range.fromLength(other.upper() + 1, this.upper())
    }

    /**
     * @param other
     *      this includes or overlaps before {@link other }
     * @return Part of this block which can be prepend to {@link block }.
     */
    prependable(other: U32Range): U32Range {
        heavyAssert(
            () => this.hasPrependable(other),
            "this has a prependable segment to other"
        )
        return U32Range.fromLength(this.lower, other.upper() - this.lower)
    }

    /**
     * @param other
     *      this and {@link other } intersect.
     * @return Intersection part between this and {@link other }.
     */
    intersection(other: U32Range): U32Range {
        heavyAssert(() => this.hasIntersection(other), "this intersects other.")
        return U32Range.fromBounds(
            Math.max(this.lower, other.lower),
            Math.min(this.upper(), other.upper())
        )
    }

    // Status
    /**
     * @param other
     * @return Are this and {@link other } an intersection?
     */
    hasIntersection(other: U32Range): boolean {
        const cmp = this.compare(other)
        return (
            RangeOrdering.OVERLAPPING_BEFORE <= cmp &&
            cmp <= RangeOrdering.OVERLAPPING_AFTER
        )
    }

    /**
     * @param other
     * @return Has this an appendable segment to {@link other }?
     */
    hasAppendable(other: U32Range): boolean {
        const cmp = this.compare(other)
        return (
            cmp === RangeOrdering.OVERLAPPING_AFTER ||
            cmp === RangeOrdering.INCLUDING_LEFT ||
            cmp === RangeOrdering.INCLUDING_MIDDLE
        )
    }

    /**
     * @param other
     * @return Has this a prependable segment to {@link other }?
     */
    hasPrependable(other: U32Range): boolean {
        const cmp = this.compare(other)
        return (
            cmp === RangeOrdering.OVERLAPPING_BEFORE ||
            cmp === RangeOrdering.INCLUDING_RIGHT ||
            cmp === RangeOrdering.INCLUDING_MIDDLE
        )
    }

    /**
     * @param other
     * @return this [order relation] other.
     */
    compare(other: U32Range): RangeOrdering {
        const thisUpper = this.upper()
        const otherUpper = other.upper()
        if (thisUpper < other.lower) {
            if (thisUpper + 1 === other.lower) {
                return RangeOrdering.PREPENDABLE
            } else {
                return RangeOrdering.BEFORE
            }
        } else if (otherUpper < this.lower) {
            if (otherUpper + 1 === this.lower) {
                return RangeOrdering.APPENDABLE
            } else {
                return RangeOrdering.AFTER
            }
        } else {
            if (this.lower === other.lower) {
                if (thisUpper === otherUpper) {
                    return RangeOrdering.EQUAL
                } else if (thisUpper < otherUpper) {
                    return RangeOrdering.INCLUDED_LEFT_BY
                } else {
                    return RangeOrdering.INCLUDING_LEFT
                }
            } else if (this.lower < other.lower) {
                if (otherUpper === thisUpper) {
                    return RangeOrdering.INCLUDING_RIGHT
                } else if (otherUpper < thisUpper) {
                    return RangeOrdering.INCLUDING_MIDDLE
                } else {
                    return RangeOrdering.OVERLAPPING_BEFORE
                }
            } else {
                if (thisUpper === otherUpper) {
                    return RangeOrdering.INCLUDED_RIGHT_BY
                } else if (thisUpper < otherUpper) {
                    return RangeOrdering.INCLUDED_MIDDLE_BY
                } else {
                    return RangeOrdering.OVERLAPPING_AFTER
                }
            }
        }
    }
}
