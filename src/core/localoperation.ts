/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "./assert"
import { Concatenable } from "./concatenable"
import { isUint32 } from "./number"

/**
 * Model an insertion in a single-user list.
 */
export class Insertion <E extends Concatenable<E>> {
    /**
     * @param index {@link Insertion#index}
     * @param items {@link Insertion#items}
     */
    constructor (index: uint32, items: E) {
        assert(() => isUint32(index), "index ∈ uint32")
        assert(() => items.length > 0, "length ∈ uint32")
        this.index = index
        this.items = items
    }

// Access
    /**
     * Insertion index.
     */
    readonly index: uint32

    /**
     * Inserted elements.
     */
    readonly items: E

    /**
     * Number of inserted elements.
     */
    get length (): uint32 {
        return this.items.length
    }
}

/**
 * Model a removal in a single-user list.
 */
export class Deletion {
    /**
     * @param index Insertion#index
     * @param items Insertion#length
     */
    constructor (index: uint32, length: uint32) {
        assert(() => isUint32(index), "index ∈ uint32")
        assert(() => isUint32(length), "length ∈ uint32")
        assert(() => length > 0, "length > 0")
        this.index = index
        this.length = length
    }

// Access
    /**
     * Removal index.
     */
    readonly index: uint32

    /**
     * Number of removed elements.
     */
    readonly length: uint32
}
