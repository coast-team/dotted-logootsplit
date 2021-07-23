import { assert } from "../util/assert.js"
/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { isObject } from "../util/data-validation.js"
import {
    compareBoolean,
    lexCompareOrdering,
    Ordering,
} from "../util/ordering.js"
import { Pos } from "./pos.js"

/**
 * An anchor can model the cursor of a participant in a replicated list.
 */
export class Anchor {
    /**
     * Lowest anchor.
     * All anchors are greater or equal to this anchor.
     */
    static BOTTOM = new Anchor(Pos.BOTTOM, true)

    /**
     * Greatest anchor.
     * All anchors are lower or equal to this anchor.
     */
    static TOP = new Anchor(Pos.TOP, false)

    static fromPlain(x: unknown): Anchor | undefined {
        if (isObject<Anchor>(x) && typeof x.isAfter === "boolean") {
            const ref = Pos.fromPlain(x.ref)
            if (ref !== undefined) {
                return new Anchor(ref, x.isAfter)
            }
        }
        return undefined
    }

    /**
     * Position to which this anchor is relative to
     */
    readonly ref: Pos

    /**
     * Is the anchor after {@link Anchor#ref}?
     */
    readonly isAfter: boolean

    /**
     * @example
     * Anchor(p) is just before p
     * Anchor(p, true) is just after p
     * There not exists another position between Anchor(p) and p
     *
     * @param ref position to which this anchor is relative to
     * @param isAfter is the anchor after `ref`?
     */
    constructor(ref: Pos, isAfter: boolean) {
        this.ref = ref
        this.isAfter = isAfter
        assert(
            () => Anchor.BOTTOM?.compare(this) !== Ordering.AFTER,
            "BOTTOM <= this"
        )
        assert(
            () => Anchor.TOP?.compare(this) !== Ordering.BEFORE,
            "this <= TOP"
        )
    }

    /**
     * @param other
     * @return this [Order relation] other
     */
    compare(other: Anchor): Ordering {
        return lexCompareOrdering(
            this.ref.compare(other.ref),
            compareBoolean(other.isAfter, this.isAfter)
        )
    }

    /**
     * @example
     * Anchor(p).compareTo(q) == Ordering.Before if p <= q
     *
     * @param pos
     * @return Is before or after {@link pos}?
     */
    compareWith(pos: Pos): Ordering.BEFORE | Ordering.AFTER {
        const rel = this.ref.compare(pos)
        if (rel !== Ordering.EQUAL) {
            return rel
        } else if (this.isAfter) {
            return Ordering.AFTER
        } else {
            return Ordering.BEFORE
        }
    }
}
