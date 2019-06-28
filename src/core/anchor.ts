/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Pos } from "./pos"
import { Ordering, lexCompareOrdering, compareBoolean } from "../util/ordering"
import { FromPlain, isObject } from "../util/data-validation"
import { u32 } from "../util/number"

/**
 * An anchor can be used to model the cursor of a participant in a
 * repliacted list.
 */
export class Anchor<P extends Pos<P>> {
    /**
     * @example
     * Anchor(p, false) is just before p
     * Anchor(p, true) is just after p
     * There does not exist a position between Anchor(p) and p
     *
     * @param ref position to which this anchor is relative to
     * @param isAfter is the anchor after `ref`?
     */
    static from<P extends Pos<P>>(ref: P, isAfter: boolean): Anchor<P> {
        return new Anchor(ref, isAfter)
    }

    static fromPlain<P extends Pos<P>>(
        posFromPlain: FromPlain<P>
    ): FromPlain<Anchor<P>> {
        return (x) => {
            if (
                isObject<{ ref: unknown; isAfter: boolean }>(x) &&
                typeof x.isAfter === "boolean"
            ) {
                const ref = posFromPlain(x.ref)
                if (ref !== undefined) {
                    return Anchor.from(ref, x.isAfter)
                }
            }
            return undefined
        }
    }

    /**
     * Position to which this anchor is relative to
     */
    readonly ref: P

    /**
     * Is the anchor after {@link Anchor#ref}?
     */
    readonly isAfter: boolean

    /**
     * @example
     * Anchor(p) is just before p
     * There not exists another position between Anchor(p) and p
     *
     * @param ref position to which this anchor is relative to
     * @param isAfter is the anchor after `ref`?
     */
    protected constructor(ref: P, isAfter: boolean) {
        this.ref = ref
        this.isAfter = isAfter
    }

    /**
     * Globally unique identifier of the author which generated this block.
     */
    replica(): ReturnType<P["replica"]> {
        return this.ref.replica()
    }

    /**
     * @param other
     * @return this [Order relation] other
     */
    compare(other: Anchor<P>): Ordering {
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
    compareWith(pos: P): Ordering.BEFORE | Ordering.AFTER {
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
