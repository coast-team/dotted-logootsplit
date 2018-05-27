/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { compareUint32, isUint32, uint32 } from "./number"
import { Ordering } from "./ordering"

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
export const enum IntervalOrdering  {
    BEFORE = -4, // <
    PREPENDABLE = -3, // <:
    OVERLAPPING_BEFORE = -2, // <∩
    INCLUDED_BY = -1, // ⊂
    EQUAL = 0, // =
    INCLUDING = 1, // ⊃
    OVERLAPPING_AFTER = 2, // >∩
    APPENDABLE = 3, // :>
    AFTER = 4 // >
}

/**
 * Interval of uint32.
 */
export class IntInterval {
    /**
     * @param lower {@link IntInterval#lower }
     * @param length  {@link IntInterval#length }
     */
    protected constructor (lower: uint32, length: uint32) {
        this.lower = lower
        this.length = length
    }

    /**
     * @param lower {@link IntInterval#lower }
     * @param length {@link IntInterval#length }
     * @return New interval.
     */
    static fromLength (lower: uint32, length: uint32): IntInterval {
        assert(() => isUint32(lower), "lower ∈ uint32")
        assert(() => isUint32(length), "length ∈ uint32")
        assert(() => length > 0, "length > 0")
        //assert(() => isUint32(lower + length))
        return new IntInterval(lower, length)
    }

    /**
     * @param lower {@link IntInterval#lower }
     * @param upper {@link IntInterval#length }
     * @return New interval.
     */
    static fromBounds (lower: uint32, upper: uint32): IntInterval {
        assert(() => isUint32(lower), "lower ∈ uint32")
        assert(() => isUint32(upper), "upper ∈ uint32")
        assert(() => lower <= upper, "lower <= upper")
        return IntInterval.fromLength(lower, upper - lower + 1)
    }

// Access
    /**
     * Lower bound.
     */
    readonly lower: uint32

    /**
     * Number of elements in the interval.
     */
    readonly length: uint32

    /**
     * @example
     * nth(0) == lower
     * nth(length - 1) == upper
     *
     * @param nth 0-based
     * @return n-th element.
     */
    nth (nth: uint32): uint32 {
        assert(() => isUint32(nth), "nth ∈ uint32")
        assert(() => nth < this.length, "valid nth")
        assert(() => isUint32(this.lower + nth), "No integer overflow")
        return this.lower + nth
    }

    /**
     * Upper bound.
     */
    get upper (): uint32 {
        return this.nth(this.length - 1)
    }

// Derivation
    /**
     * @param other
     * @return {@link other } appended to this.
     */
    append (other: IntInterval): IntInterval {
        assert(() => other.compare(this) === IntervalOrdering.APPENDABLE,
            "other is appendable to this")
        return new IntInterval(this.lower, this.length + other.length)
    }

    /**
     * @param index where split.
     *      0 < index < length
     * @return Right and left splits.
     */
    splitAt (index: uint32): [IntInterval, IntInterval] {
        assert(() => isUint32(index), "index ∈ uint32")
        assert(() => 0 < index && index < this.length, "0 < index < this.length")

        const leftInterval = new IntInterval(this.lower, index)
        const rightInterval = new IntInterval(this.lower  + index, this.length - index)
        return [leftInterval, rightInterval]
    }

// Status
    /**
     * @param other
     * @return this [order relation] other.
     */
    compare (other: IntInterval): IntervalOrdering {
        if (this.upper < other.lower) {
            if (this.upper + 1 === other.lower) {
                return IntervalOrdering.PREPENDABLE
            } else {
                return IntervalOrdering.BEFORE
            }
        } else if (other.upper < this.lower) {
            if (other.upper + 1 === this.lower) {
                return IntervalOrdering.APPENDABLE
            } else {
                return IntervalOrdering.AFTER
            }
        } else {
            if (this.lower === other.lower) {
                if (this.upper === other.upper) {
                    return IntervalOrdering.EQUAL
                } else if (this.upper < other.upper) {
                    return IntervalOrdering.INCLUDED_BY
                } else {
                    return IntervalOrdering.INCLUDING
                }
            } else if (this.lower < other.lower) {
                if (other.upper <= this.upper) {
                    return IntervalOrdering.INCLUDING
                } else {
                    return IntervalOrdering.OVERLAPPING_BEFORE
                }
            } else {
                if (this.upper <= other.upper) {
                    return IntervalOrdering.INCLUDED_BY
                } else {
                    return IntervalOrdering.OVERLAPPING_AFTER
                }
            }
        }
    }
}
