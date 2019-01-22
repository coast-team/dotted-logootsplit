/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { Ordering } from "./ordering"

export type u32 = number
export type i32 = number

export const U32_BOTTOM = 0
export const U32_TOP = 0xFFFF_FFFF // 2^32 - 1

/**
 * @param n
 * @return Is {@link n} an unsigned integer 32?
 */
export const isU32 = (n: unknown): n is u32 =>
    typeof n === "number" &&
    Number.isSafeInteger(n) && U32_BOTTOM <= n && n <= U32_TOP

/**
 * @param n1
 * @param n2
 * @return Order relation between {@link n1} and {@link n2}.
 */
export function compareU32 (n1: u32, n2: u32): Ordering {
    assert(() => isU32(n1), "n1 ∈ u32")
    assert(() => isU32(n2), "n2 ∈ u32")

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
export const digestOf = (values: ReadonlyArray<u32>): u32 =>
    values.reduce((acc, v) => (acc * 17 >>> 0) + v >>> 0)

export const absoluteSubstraction = (a: u32, b: u32): u32 => {
    return (a < b) ? (b - a) : (a - b)
}
