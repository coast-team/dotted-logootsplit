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
export const U32_TOP = 0xffff_ffff // 2^32 - 1

/**
 * @param n
 * @return Is {@link n} an unsigned integer 32?
 */
export const isU32 = (n: unknown): n is u32 =>
    typeof n === "number" && n === n >>> 0

/**
 * @param n1
 * @param n2
 * @return Order relation between {@link n1} and {@link n2}.
 */
export const compareU32 = (n1: u32, n2: u32): Ordering => Math.sign(n1 - n2)

/**
 * @param values
 * @return Non-cryptographic way to approximate identity of {@link values }.
 */
export const hashCodeOf = (values: readonly u32[] | Uint32Array): u32 => {
    let acc = 0
    for (const v of values) {
        acc = (((acc * 17) >>> 0) + v) >>> 0
    }
    return acc
}

export const absoluteSubstraction = (a: u32, b: u32): u32 => {
    return a < b ? b - a : a - b
}
