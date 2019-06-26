/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert } from "../../util/assert"
import { isObject } from "../../util/data-validation"
import {
    compareU32,
    hashCodeOf,
    isU32,
    u32,
    U32_BOTTOM,
    U32_TOP,
} from "../../util/number"
import { lexCompareOrdering, Ordering } from "../../util/ordering"

/**
 * @final this class cannot be extended
 *
 * Part of a {@link SimpleDotPos}.
 *
 * A part is a lexicographic triplet (priority, replica, seq).
 * The dot (replica, seq) uniquely identifies.
 */
export class SimpleDotPosPart {
    /**
     * @param priority {@link SimpleDotPosPart#priority }
     * @param replica {@link SimpleDotPosPart#replica }
     * @param seq {@link SimpleDotPosPart#seq }
     */
    private constructor(priority: u32, replica: u32, seq: u32) {
        assert(() => isU32(priority), "random ∈ u32")
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => isU32(seq), "seq ∈ u32")
        this.priority = priority
        this.replica = replica
        this.seq = seq
    }

    /**
     * @param priority {@link SimpleDotPosPart#priority }
     *      ∉ {U32_BOTTOM, U32_TOP}
     * @param replica {@link SimpleDotPosPart#replica }
     *      !== U32_TOP
     * @param seq {@link SimpleDotPosPart#seq }
     */
    static from(priority: u32, replica: u32, seq: u32): SimpleDotPosPart {
        assert(
            () => priority !== U32_BOTTOM && priority !== U32_TOP,
            "priority ∉ {U32_BOTTOM, U32_TOP}"
        )
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. Reserved for BOTTOM and TOP."
        )
        assert(() => seq !== 0, "seq != 0. Reserved for convenience.")
        return new SimpleDotPosPart(priority, replica, seq)
    }

    /**
     * @note {@link SimpleDotPosPart#BOTTOM} and {@link SimpleDotPosPart#TOP}
     * are not valid candidates.
     *
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): SimpleDotPosPart | undefined {
        if (
            isObject<SimpleDotPosPart>(x) &&
            isU32(x.priority) &&
            isU32(x.replica) &&
            isU32(x.seq) &&
            x.seq !== 0
        ) {
            return new SimpleDotPosPart(x.priority, x.replica, x.seq)
        }
        return undefined
    }

    /**
     * Lowest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly BOTTOM = new SimpleDotPosPart(U32_BOTTOM, U32_TOP, 1)

    /**
     * Greatest part.
     * Here the pair (replica, seq) has no meaning.
     */
    static readonly TOP = new SimpleDotPosPart(U32_TOP, U32_TOP, 2)

    // Derivation
    /**
     * @param seq The seq of the new SimpleDotPosPart
     * @return part with the same base,
     *  but with a different seq
     */
    withSeq(seq: u32): SimpleDotPosPart {
        assert(() => isU32(seq), "seq ∈ u32")
        return new SimpleDotPosPart(this.priority, this.replica, seq)
    }

    // Access
    /**
     * Priority of the part over another one.
     * If two parts have the same priority, the lexicographic pair
     * (replica, seq) is used as disambiguator.
     */
    readonly priority: u32

    /**
     * Globally unique identifier of the author which generated this part.
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
    asTuple(): readonly [u32, u32, u32] {
        return [this.priority, this.replica, this.seq]
    }

    /**
     * Non-cryptographic way to approximate object identity.
     */
    hashCode(): u32 {
        return hashCodeOf(this.asTuple())
    }

    // Status
    /**
     * @example
     * SimpleDotPosPart(0, 0, _) == SimpleDotPosPart(0, 0, _)
     * SimpleDotPosPart(0, 0, _) < SimpleDotPosPart(1, 0, _)
     * SimpleDotPosPart(1, 0, _) < SimpleDotPosPart(1, 1, _)
     *
     * Lexicographic order of pair (priority, replica).
     *
     * @param other
     * @return this [Order relation] {@link other }, regardless their seqs
     *  ({@link SimpleDotPosPart#seq}).
     */
    compareBase(other: SimpleDotPosPart): Ordering {
        return lexCompareOrdering(
            compareU32(this.priority, other.priority),
            compareU32(this.replica, other.replica)
        )
    }

    /**
     * @example
     * SimpleDotPosPart(0, 0, 0) < SimpleDotPosPart(1, 0, 0)
     * SimpleDotPosPart(1, 0, 0) < SimpleDotPosPart(1, 1, 0)
     * SimpleDotPosPart(1, 1, 0) < SimpleDotPosPart(1, 1, 1)
     *
     * Lexicographic order of triple (priority, replica, seq).
     *
     * @param other
     * @return this [Order relation] {@link other}.
     */
    compare(other: SimpleDotPosPart): Ordering {
        if (this === other) {
            return Ordering.EQUAL
        } else {
            return lexCompareOrdering(
                this.compareBase(other),
                compareU32(this.seq, other.seq)
            )
        }
    }
}
