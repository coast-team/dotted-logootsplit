/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { ReadonlyTypeableArray } from "typeable-array"

import { assert } from "./assert"
import { Ordering } from "./ordering"

export const UINT32_BOTTOM = 0
export const UINT32_TOP = 0xFFFF_FFFF // 2^32 - 1

/**
 * @param n
 * @return Is {@link n} an uint32?
 */
export const isUint32 = (n: number): n is uint32 =>
    Number.isSafeInteger(n) && UINT32_BOTTOM <= n && n <= UINT32_TOP

/**
 * @param n
 * @return cast {@link n } as an uint32 (potential overflow).
 */
export const uint32 = (n: number): uint32 => n >>> 0

/**
 * @param l lower bound
 * @param excludedU excluded upper bound.
 * @return Random uint32 in [{@link l}, {@link excludedU}[
 *  Note that UINT32_TOP cannot be generated.
 */
export function nextRandomUint32 (l: uint32, excludedU: uint32): uint32 {
    assert(() => isUint32(l), "l ∈ uint32")
    assert(() => isUint32(excludedU), "excludedU ∈ uint32")
    assert(() => l < excludedU, "l < excludedU")

    const randomPositiveFloat = (Math.random() * (excludedU - l)) + l
        // Generate a random float number in [b1, b2[
    const result: uint32 = randomPositiveFloat >>> 0
        // Truncate the float in order to get an uint32

    assert(() => l <= result && result < excludedU, "result ∈ [l, excludedU[")
    return result
}

/**
 * @param n1
 * @param n2
 * @return Order relation between {@link n1} and {@link n2}.
 */
export function compareUint32 (n1: uint32, n2: uint32): Ordering {
    assert(() => isUint32(n1), "n1 ∈ uint32")
    assert(() => isUint32(n2), "n2 ∈ uint32")

    if (n1 < n2) {
        return Ordering.BEFORE
    } else if (n1 > n2) {
        return Ordering.AFTER
    } else {
        return Ordering.EQUAL
    }
}

/**
 * @param values
 * @return hash code of {@link values }.
 */
export const digestOf = (values: ReadonlyTypeableArray<uint32>): uint32 =>
    values.reduce((acc, v) => uint32(uint32(acc * 17) + v))

export const absoluteSubstraction = (a: uint32, b: uint32): uint32 =>
    (a < b) ? (b - a) : (a - b)
