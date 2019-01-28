/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { Concat } from "./concat"
import { isU32, u32 } from "./number"

/**
 * Model an insertion in a single-user list.
 */
export class Ins<E extends Concat<E>> {
    /**
     * @param index Insertion index.
     * @param items Inserted elements.
     */
    constructor(readonly index: u32, readonly items: E) {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => items.length > 0, "length ∈ u32")
        this.index = index
        this.items = items
    }

    // Access
    /**
     * Number of inserted elements.
     */
    get length(): u32 {
        return this.items.length
    }

    endIndex(): u32 {
        return this.index + this.length
    }
}

/**
 * Model a removal in a single-user list.
 */
export class Del {
    /**
     * @param index Removal index.
     * @param items Number of removed elements.
     */
    constructor(readonly index: u32, readonly length: u32) {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length > 0")
    }

    endIndex(): u32 {
        return this.index + this.length
    }
}
