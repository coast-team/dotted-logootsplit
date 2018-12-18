/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../core/assert"
import { isObject } from "../core/data-validation"
import {
    compareUint32,
    digestOf,
    isUint32,
    uint32,
    UINT32_BOTTOM,
    UINT32_TOP,
} from "../core/number"
import { lexCompareOrdering, Ordering } from "../core/ordering"

/**
 * Part of a {@link SimplePosition}.
 *
 * A part if a lexicographic triplet (priority, replica, seq).
 * The dot (replica, seq) uniquely identifies.
 */
export class SimplePositionPart {
    /**
     * @param priority {@link SimplePositionPart#priority }
     * @param replica {@link SimplePositionPart#replica }
     * @param seq {@link SimplePositionPart#seq }
     */
    protected constructor (priority: uint32, replica: uint32, seq: uint32) {
        assert(() => isUint32(priority), "random ∈ uint32")
        assert(() => isUint32(replica), "replica ∈ uint32")
        assert(() => isUint32(seq), "seq ∈ uint32")
        this.priority = priority
        this.replica = replica
        this.seq = seq
    }

    /**
     * @param priority {@link SimplePositionPart#priority }
     *      ∉ {UINT32_BOTTOM, UINT32_TOP}
     * @param replica {@link SimplePositionPart#replica }
     * @param seq {@link SimplePositionPart#seq }
     */
    static from (priority: uint32, replica: uint32, seq: uint32): SimplePositionPart {
        assert(() => priority !== UINT32_BOTTOM && priority !== UINT32_TOP,
            "priority ∉ {UINT32_BOTTOM, UINT32_TOP}")
        assert(() => replica !== UINT32_TOP,
            "replica != UINT32_TOP. This is reserved for BOTTOM and TOP.")
        return new SimplePositionPart(priority, replica, seq)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain (x: unknown): SimplePositionPart | undefined {
        if (isObject<SimplePositionPart>(x) && isUint32(x.priority) &&
            isUint32(x.replica) && isUint32(x.seq)) {

            return new SimplePositionPart(x.priority, x.replica, x.seq)
        }
        return undefined
    }

    /**
     * Lowest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly BOTTOM = new SimplePositionPart(UINT32_BOTTOM, UINT32_TOP, 0)

    /**
     * Greatest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly TOP = new SimplePositionPart(UINT32_TOP, UINT32_TOP, 1)

// Derivation
    /**
     * @param {uint32} seq The seq of the new PositionPart
     * @return {SimplePositionPart} with the same base,
     *  but with a different seq
     */
    withSeq (seq: uint32): SimplePositionPart {
        assert(() => isUint32(seq), "seq ∈ uint32")
        return SimplePositionPart.from(this.priority, this.replica, seq)
    }

// Access
    /**
     * Priority of the part over another one. Lower is better.
     *
     * If two parts have the same priority, the lexicographic pair
     * (replica, seq) is used as disambiguator.
     */
    readonly priority: uint32

    /**
     * Globally unique identifier of the
     * author which generated this part.
     */
    readonly replica: uint32

    /**
     * Locally unique sequence number.
     * Each generated part has a sequence number.
     */
    readonly seq: uint32

    /**
     * @return [priority, replica, seq]
     */
    asTuple (): [uint32, uint32, uint32] {
        return [this.priority, this.replica, this.seq]
    }

    /**
     * Hash code.
     */
    get digest (): uint32 {
        return digestOf(this.asTuple())
    }

// Status
    /**
     * @example
     * SimplePositionPart(0, 0, _) == SimplePositionPart(0, 0, _)
     * SimplePositionPart(0, 0, _) < SimplePositionPart(1, 0, _)
     * SimplePositionPart(1, 0, _) < SimplePositionPart(1, 1, _)
     *
     * Lexicographic order of pair (priority, replica).
     *
     * @param other
     * @return Compare this and {@link other } regardless their sequence
     *  {@link SimplePositionPart#seq}
     */
    compareBase (other: SimplePositionPart): Ordering {
        return lexCompareOrdering(
            compareUint32(this.priority, other.priority),
            compareUint32(this.replica, other.replica)
        )
    }

    /**
     * @example
     * SimplePositionPart(0, 0, 0) < SimplePositionPart(1, 0, 0)
     * SimplePositionPart(1, 0, 0) < SimplePositionPart(1, 1, 0)
     * SimplePositionPart(1, 1, 0) < SimplePositionPart(1, 1, 1)
     *
     * Lexicographic order of triple (priority, replica, seq).
     *
     * @param other
     * @return this [Order relation] {@link other}.
     */
    compare (other: SimplePositionPart): Ordering {
        return (this === other)
            ? Ordering.EQUAL
            : lexCompareOrdering(
                this.compareBase(other),
                compareUint32(this.seq, other.seq)
            )
    }
}
