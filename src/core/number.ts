/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { Ordering } from "./ordering"

export type uint32 = number

export const UINT32_BOTTOM = 0
export const UINT32_TOP = 0xFFFF_FFFF // 2^32 - 1

/**
 * @param n
 * @return Is {@link n} an uint32?
 */
export const isUint32 = (n: unknown): n is uint32 =>
    typeof n === "number" &&
    Number.isSafeInteger(n) && UINT32_BOTTOM <= n && n <= UINT32_TOP

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
export const digestOf = (values: ReadonlyArray<uint32>): uint32 =>
    values.reduce((acc, v) => (acc * 17 >>> 0) + v >>> 0)

export const absoluteSubstraction = (a: uint32, b: uint32): uint32 =>
    (a < b) ? (b - a) : (a - b)
