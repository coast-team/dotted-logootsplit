/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Position } from "./position"
import { Ordering } from "./ordering"

/**
 * An anchor can be used to model the cursor, the selection of a participant in
 * a coeditable list.
 *
 * An anchor is always just before a given {@link Position }.
 */
export class Anchor <P extends Position<P>> {
    /**
     * @example
     * Anchor(p) is just before p
     * There not exists another position between Anchor(p) and p
     *
     * @param ref {@link Anchor#reference}
     */
    constructor (ref: P) {
        this.reference = ref
    }

// Access
    /**
     * Position to which this anchor is relative to.
     */
    readonly reference: P

// Status
    /**
     * @param other
     * @return this [Order relation] other
     */
    compare (other: Anchor<P>): Ordering {
        return this.reference.compare(other.reference)
    }

    /**
     * @example
     * Anchor(p).compareTo(q) == Ordering.Before if p <= q
     *
     * @param pos
     * @return Is before or after {@link pos}?
     */
    compareTo (pos: P): Ordering.BEFORE | Ordering.AFTER {
        // TODO: avoid union type.
        // use a specific enum type? or just Ordering?
        const rel = this.reference.compare(pos)
        if (rel !== Ordering.EQUAL) {
            return rel
        } else {
            return Ordering.BEFORE
        }
    }
}
