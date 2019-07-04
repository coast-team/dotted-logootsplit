/*
    Copyright (C) 2019  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../util/assert"
import { isU32, u32 } from "../util/number"
import { isObject } from "../util/data-validation"

const TYPE = "DEL"

/**
 * @param index Removal index.
 * @param items Number of removed elements.
 */
const from = (index: u32, length: u32): Del => {
    assert(() => isU32(index), "index ∈ u32")
    assert(() => isU32(length), "length ∈ u32")
    return { type: TYPE, index, length }
}

/**
 * Model a removal in a single-user list.
 */
export interface Del {
    /**
     * Operation type
     */
    readonly type: typeof TYPE

    /**
     * Index of deletion.
     */
    readonly index: u32

    /**
     * Number of removed elements.
     */
    readonly length: u32
}

export const Del = { TYPE, from } as const

/**
 * @param x
 * @return Is `x` a Del operation?
 */
export const isDel = (x: unknown): x is Del =>
    isObject<Del>(x) && x.type === TYPE && isU32(x.index) && isU32(x.length)
