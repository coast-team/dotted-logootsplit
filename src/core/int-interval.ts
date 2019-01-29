/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { isU32, u32 } from "./number"

/**
 * Possible order relation between two intervals.
 *
 * @example
 * [0, 2] < [4, 6]
 * [0, 2] <: [3, 6]
 * [0, 4] <∩ [4, 6] (because their intersection is not empty)
 * [0, 2] ⊂ [0, 3]
 * [0, 2] = [0, 2]
 */
export const enum IntervalOrdering {
    BEFORE = -4, // <
    PREPENDABLE = -3, // <:
    OVERLAPPING_BEFORE = -2, // <∩
    INCLUDED_BY = -1, // ⊂
    EQUAL = 0, // =
    INCLUDING = 1, // ⊃
    OVERLAPPING_AFTER = 2, // >∩
    APPENDABLE = 3, // :>
    AFTER = 4, // >
}

/**
 * Interval of u32.
 */
export class IntInterval {
    /**
     * @param lower Lower bound.
     * @param length Number of elements in the interval.
     */
    protected constructor(readonly lower: u32, readonly length: u32) {}

    /**
     * @param lower {@link IntInterval#lower }
     * @param length {@link IntInterval#length }
     * @return New interval.
     */
    static fromLength(lower: u32, length: u32): IntInterval {
        assert(() => isU32(lower), "lower ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length > 0")
        //assert(() => isu32(lower + length))
        return new IntInterval(lower, length)
    }

    /**
     * @param lower {@link IntInterval#lower }
     * @param upper {@link IntInterval#length }
     * @return New interval.
     */
    static fromBounds(lower: u32, upper: u32): IntInterval {
        assert(() => isU32(lower), "lower ∈ u32")
        assert(() => isU32(upper), "upper ∈ u32")
        assert(() => lower <= upper, "lower <= upper")
        return IntInterval.fromLength(lower, upper - lower + 1)
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
    append(other: IntInterval): IntInterval {
        assert(
            () => other.compare(this) === IntervalOrdering.APPENDABLE,
            "other is appendable to this"
        )
        return new IntInterval(this.lower, this.length + other.length)
    }

    // Status
    /**
     * @param other
     * @return this [order relation] other.
     */
    compare(other: IntInterval): IntervalOrdering {
        if (this.upper() < other.lower) {
            if (this.upper() + 1 === other.lower) {
                return IntervalOrdering.PREPENDABLE
            } else {
                return IntervalOrdering.BEFORE
            }
        } else if (other.upper() < this.lower) {
            if (other.upper() + 1 === this.lower) {
                return IntervalOrdering.APPENDABLE
            } else {
                return IntervalOrdering.AFTER
            }
        } else {
            if (this.lower === other.lower) {
                if (this.upper() === other.upper()) {
                    return IntervalOrdering.EQUAL
                } else if (this.upper() < other.upper()) {
                    return IntervalOrdering.INCLUDED_BY
                } else {
                    return IntervalOrdering.INCLUDING
                }
            } else if (this.lower < other.lower) {
                if (other.upper() <= this.upper()) {
                    return IntervalOrdering.INCLUDING
                } else {
                    return IntervalOrdering.OVERLAPPING_BEFORE
                }
            } else {
                if (this.upper() <= other.upper()) {
                    return IntervalOrdering.INCLUDED_BY
                } else {
                    return IntervalOrdering.OVERLAPPING_AFTER
                }
            }
        }
    }
}
