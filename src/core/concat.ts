/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { isUint32, uint32 } from "./number"

/**
 * Concatenable and sliceable types.
 * Native types Array and String implements this interface.
 */
export interface Concat <E extends Concat<E>> {
    /**
     * Number of elements.
     */
    readonly length: uint32

    /**
     * "abc".slice(0, 3) === "abc"
     * "abc".slice(1, 2) === "b"
     *
     * @param lower index where the slice starts.
     * @param excludedUpper excluded index where the slice ends.
     * @return Slice between indexes [`lower', `excludedUpper'[.
     */
    readonly slice: (lower: uint32, excludedUpper: uint32) => E

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
 * For instance ConcatenableLength(3) can represent "abc", [1, 2, 3], or any
 * 3-elements list.
 */
export class ConcatenableLength implements Concat<ConcatenableLength> {
    /** Nominal typing */
    private readonly brandConcatenableLength: undefined

    /**
     * @param length Concatenable#length
     */
    constructor (readonly length: uint32) {
        assert(() => isUint32(length), "length ∈ uint32")
    }

// Access
    /** @override */
    slice (lower: uint32, excludedUpper: uint32): ConcatenableLength {
        assert(() => isUint32(lower), "lower ∈ uint32")
        assert(() => lower < this.length, "lower < this.length")
        assert(() => isUint32(excludedUpper), "excludedUpper ∈ uint32")
        assert(() => excludedUpper <= this.length, "excludedUpper <= this.length")
        assert(() => lower <= excludedUpper, "lower <= excludedUpper")
        return new ConcatenableLength(excludedUpper - lower)
    }

    /** @override */
    concat (other: ConcatenableLength): ConcatenableLength {
        assert(() => isUint32(this.length + other.length), "valid concatenation")
        return new ConcatenableLength(this.length + other.length)
    }
}
