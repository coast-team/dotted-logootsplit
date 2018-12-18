/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../../core/assert"
import { isObject } from "../../core/data-validation"
import {
    compareU32,
    digestOf,
    isU32,
    u32,
    U32_BOTTOM,
    U32_TOP,
} from "../../core/number"
import { lexCompareOrdering, Ordering } from "../../core/ordering"

/**
 * Part of a {@link SimplePos}.
 *
 * A part if a lexicographic triplet (priority, replica, seq).
 * The dot (replica, seq) uniquely identifies.
 */
export class SimplePosPart {
    /**
     * @param priority {@link SimplePosPart#priority }
     * @param replica {@link SimplePosPart#replica }
     * @param seq {@link SimplePosPart#seq }
     */
    protected constructor (priority: u32, replica: u32, seq: u32) {
        assert(() => isU32(priority), "random ∈ u32")
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => isU32(seq), "seq ∈ u32")
        this.priority = priority
        this.replica = replica
        this.seq = seq
    }

    /**
     * @param priority {@link SimplePosPart#priority }
     *      ∉ {U32_BOTTOM, U32_TOP}
     * @param replica {@link SimplePosPart#replica }
     * @param seq {@link SimplePosPart#seq }
     */
    static from (priority: u32, replica: u32, seq: u32): SimplePosPart {
        assert(() => priority !== U32_BOTTOM && priority !== U32_TOP,
            "priority ∉ {U32_BOTTOM, U32_TOP}")
        assert(() => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP.")
        return new SimplePosPart(priority, replica, seq)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain (x: unknown): SimplePosPart | undefined {
        if (isObject<SimplePosPart>(x) && isU32(x.priority) &&
            isU32(x.replica) && isU32(x.seq)) {

            return new SimplePosPart(x.priority, x.replica, x.seq)
        }
        return undefined
    }

    /**
     * Lowest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly BOTTOM = new SimplePosPart(U32_BOTTOM, U32_TOP, 0)

    /**
     * Greatest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly TOP = new SimplePosPart(U32_TOP, U32_TOP, 1)

// Derivation
    /**
     * @param {u32} seq The seq of the new SimplePosPart
     * @return {SimplePosPart} with the same base,
     *  but with a different seq
     */
    withSeq (seq: u32): SimplePosPart {
        assert(() => isU32(seq), "seq ∈ u32")
        return SimplePosPart.from(this.priority, this.replica, seq)
    }

// Access
    /**
     * Priority of the part over another one. Lower is better.
     *
     * If two parts have the same priority, the lexicographic pair
     * (replica, seq) is used as disambiguator.
     */
    readonly priority: u32

    /**
     * Globally unique identifier of the
     * author which generated this part.
     */
    readonly replica: u32

    /**
     * Locally unique sequence number.
     * Each generated part has a sequence number.
     */
    readonly seq: u32

    /**
     * @return [priority, replica, seq]
     */
    asTuple (): [u32, u32, u32] {
        return [this.priority, this.replica, this.seq]
    }

    /**
     * Hash code.
     */
    digest (): u32 {
        return digestOf(this.asTuple())
    }

// Status
    /**
     * @example
     * SimplePosPart(0, 0, _) == SimplePosPart(0, 0, _)
     * SimplePosPart(0, 0, _) < SimplePosPart(1, 0, _)
     * SimplePosPart(1, 0, _) < SimplePosPart(1, 1, _)
     *
     * Lexicographic order of pair (priority, replica).
     *
     * @param other
     * @return Compare this and {@link other } regardless their sequence
     *  {@link SimplePosPart#seq}
     */
    compareBase (other: SimplePosPart): Ordering {
        return lexCompareOrdering(
            compareU32(this.priority, other.priority),
            compareU32(this.replica, other.replica)
        )
    }

    /**
     * @example
     * SimplePosPart(0, 0, 0) < SimplePosPart(1, 0, 0)
     * SimplePosPart(1, 0, 0) < SimplePosPart(1, 1, 0)
     * SimplePosPart(1, 1, 0) < SimplePosPart(1, 1, 1)
     *
     * Lexicographic order of triple (priority, replica, seq).
     *
     * @param other
     * @return this [Order relation] {@link other}.
     */
    compare (other: SimplePosPart): Ordering {
        return (this === other)
            ? Ordering.EQUAL
            : lexCompareOrdering(
                this.compareBase(other),
                compareU32(this.seq, other.seq)
            )
    }
}
