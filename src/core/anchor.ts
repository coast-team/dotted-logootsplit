/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Pos } from "./pos"
import { Ordering } from "./ordering"

/**
 * An anchor can be used to model the cursor, the selection of a participant in
 * a coeditable list.
 *
 * An anchor is always just before a given {@link Pos }.
 */
export class Anchor <P extends Pos<P>> {
    /**
     * @example
     * Anchor(p) is just before p
     * There not exists another position between Anchor(p) and p
     *
     * @param ref position to which this anchor is relative to.
     */
    constructor (readonly ref: P) {}

// Status
    /**
     * @param other
     * @return this [Order relation] other
     */
    compare (other: Anchor<P>): Ordering {
        return this.ref.compare(other.ref)
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
        const rel = this.ref.compare(pos)
        if (rel !== Ordering.EQUAL) {
            return rel
        } else {
            return Ordering.BEFORE
        }
    }
}
