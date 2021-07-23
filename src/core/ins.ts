/*
    Copyright (C) 2019  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../util/assert.js"
import { isObject } from "../util/data-validation.js"
import type { u32 } from "../util/number.js"
import { isU32 } from "../util/number.js"

const TYPE = "INS"

/**
 * @param index index of insertion.
 * @param content Inserted elements.
 */
const from = <E>(index: u32, content: E): Ins<E> => {
    assert(() => isU32(index), "index ∈ u32")
    return { type: TYPE, index, content }
}

/**
 * Model an insertion in a single-user list.
 */
export interface Ins<E> {
    /**
     * Operation type
     */
    readonly type: typeof TYPE

    /**
     * Index of insertion.
     */
    readonly index: u32

    /**
     * Inserted elements.
     */
    readonly content: E
}

export const Ins = { TYPE, from } as const

/**
 * @curried
 * @param f guard to test the content's type
 * @param x
 * @return Is `x` an Ins operation?
 */
export const isIns = <E>(f: (x: unknown) => x is E) => (
    x: unknown
): x is Ins<E> =>
    isObject<Ins<unknown>>(x) &&
    x.type === TYPE &&
    isU32(x.index) &&
    f(x.content)
