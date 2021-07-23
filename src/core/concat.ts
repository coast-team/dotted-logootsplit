/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../util/assert.js"
import { isObject } from "../util/data-validation.js"
import type { u32 } from "../util/number.js"
import { isU32 } from "../util/number.js"

/**
 * Concatenable and sliceable types.
 * Native types Array and String implements this interface.
 */
export interface Concat<E extends Concat<E>> {
    /**
     * Number of elements.
     */
    readonly length: u32

    /**
     * "abc".slice(0, 3) === "abc"
     * "abc".slice(1, 2) === "b"
     *
     * @param lower index where the slice starts.
     * @param excludedUpper excluded index where the slice ends.
     * @return Slice between indexes [`lower', `excludedUpper'[.
     */
    readonly slice: (lower: u32, excludedUpper: u32) => E

    /**
     * @param other appended elements
     * @return `other' appended to `this'.
     */
    readonly concat: (other: E) => E
}

/**
 * Minimal implementation of Concatenable.
 * This enables to model a number of elements without their availability.
 *
 * For instance ConcatLength(3) can represent "abc", [1, 2, 3], or any
 * 3-elements list.
 */
export class ConcatLength implements Concat<ConcatLength> {
    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): ConcatLength | undefined {
        if (isObject<ConcatLength>(x) && isU32(x.length)) {
            return new ConcatLength(x.length)
        }
        return undefined
    }

    /** Nominal typing */
    private readonly brandConcatenableLength: undefined

    /**
     * @param length {@link Concat#length}
     */
    constructor(readonly length: u32) {
        assert(() => isU32(length), "length ∈ u32")
    }

    // Access
    /** @override */
    slice(lower: u32, excludedUpper: u32): ConcatLength {
        assert(() => isU32(lower), "lower ∈ u32")
        assert(() => lower < this.length, "lower < this.length")
        assert(() => isU32(excludedUpper), "excludedUpper ∈ u32")
        assert(
            () => excludedUpper <= this.length,
            "excludedUpper <= this.length"
        )
        assert(() => lower <= excludedUpper, "lower <= excludedUpper")
        return new ConcatLength(excludedUpper - lower)
    }

    /** @override */
    concat(other: ConcatLength): ConcatLength {
        assert(() => isU32(this.length + other.length), "valid concatenation")
        return new ConcatLength(this.length + other.length)
    }
}
