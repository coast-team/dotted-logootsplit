/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../../core/assert"
import { isObject, fromArray } from "../../core/data-validation"
import {
    absoluteSubstraction,
    compareU32,
    digestOf,
    isU32,
    u32,
    U32_BOTTOM,
    U32_TOP,
} from "../../core/number"
import { BaseOrdering, baseOrderingInversion } from "../../core/pos"
import { SimpleDotPosPart } from "./simple-dot-pos-part"
import { Ordering, orderingInversion } from "../../core/ordering"
import { DotPos } from "../../core/dot-pos"

/**
 * @final this class cannot be extended
 *
 * A position can be represented as a lexicographic list of
 * lexicographic triplets (priority, replica, seq).
 * Theses triplets are the parts of the position.
 *
 * The dot (replica, seq) uniquely identifies the position.
 *
 * The set of positions is dense, hence you can always author a new position
 * between two distinct positions. A position can be generated between two
 * int-successive positions (see {@link Pos}) by suffixing a new triplet
 * to the lower position.
 */
export class SimpleDotPos implements DotPos<SimpleDotPos> {
    /**
     * @param parts {@link SimpleDotPos#parts }
     */
    private constructor(parts: ReadonlyArray<SimpleDotPosPart>) {
        assert(() => parts.length > 0, "parts must not be empty")
        this.parts = parts
    }

    /**
     * @param parts {@link SimpleDotPos#parts }
     *  The last part must be distinct of SimplePosPart.BOTTOM and
     *  SimplePosPart.TOP.
     * @return Position with {@link parts } as {@link SimpleDotPos#parts }.
     */
    static from(parts: ReadonlyArray<SimpleDotPosPart>): SimpleDotPos {
        const lastPart = parts[parts.length - 1]
        assert(
            () =>
                lastPart.priority !== U32_BOTTOM &&
                lastPart.priority !== U32_TOP,
            "priority ∉ {U32_BOTTOM, U32_TOP}"
        )
        assert(
            () => lastPart.replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP."
        )
        return new SimpleDotPos(parts)
    }

    /**
     * @note {@link SimpleDotPos#BOTTOM } and {@link SimpleDotPos#TOP }
     * are not valid candidates.
     *
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): SimpleDotPos | undefined {
        if (isObject<SimpleDotPos>(x) && Array.isArray(x.parts)) {
            const parts = fromArray(x.parts, SimpleDotPosPart.fromPlain)
            if (parts !== undefined && parts.length > 0) {
                const lastPart = parts[parts.length - 1]
                if (
                    lastPart.priority !== U32_BOTTOM &&
                    lastPart.priority !== U32_TOP &&
                    lastPart.replica !== U32_TOP
                ) {
                    return SimpleDotPos.from(parts)
                }
            }
        }
        return undefined
    }

    /**
     * Lowest position.
     */
    static readonly BOTTOM = new SimpleDotPos([SimpleDotPosPart.BOTTOM])

    /**
     * Greatest position.
     */
    static readonly TOP = new SimpleDotPos([SimpleDotPosPart.TOP])

    // Derivation
    /**
     * @param seq The seq of the new position
     * @return Position with the same base, but with a different seq.
     */
    withSeq(seq: u32): SimpleDotPos {
        assert(() => isU32(seq), "seq ∈ u32")
        const parts = [...this.parts]
        const lastIndex = parts.length - 1
        parts[lastIndex] = parts[lastIndex].withSeq(seq)
        return new SimpleDotPos(parts)
    }

    /** @override */
    intSucc(n: u32): SimpleDotPos {
        assert(() => isU32(n), "n ∈ u32")
        assert(() => this.hasIntSucc(n), "this has a n-th successor")
        return this.withSeq(this.seq() + n)
    }

    // Access
    /**
     * Parts of this position.
     */
    readonly parts: ReadonlyArray<SimpleDotPosPart>

    /**
     * Last part of {@link SimplePosPart#parts }.
     */
    lastPart(): SimpleDotPosPart {
        return this.parts[this.parts.length - 1]
    }

    /**
     * Number of part in {@link SimplePosPart#parts }.
     */
    depth(): u32 {
        return this.parts.length
    }

    /** @override */
    replica(): u32 {
        return this.lastPart().replica
    }

    /** @override */
    seq(): u32 {
        return this.lastPart().seq
    }

    /** @override */
    intDistance(other: SimpleDotPos): [u32, Ordering] {
        if (this.depth() > other.depth()) {
            const [dist, order] = other.intDistance(this)
            return [dist, orderingInversion[order]]
        } else {
            heavyAssert(
                () =>
                    ((cmp) =>
                        cmp === BaseOrdering.PREFIXING ||
                        cmp === BaseOrdering.EQUAL)(this.compareBase(other)),
                "this prefix or is equal to other"
            )

            const otherIntermediateSeq = other.parts[this.depth() - 1].seq
            const seq = this.seq()
            return [
                absoluteSubstraction(seq, otherIntermediateSeq),
                compareU32(seq, otherIntermediateSeq),
            ]
        }
    }

    /** @override */
    digest(): u32 {
        return digestOf(this.parts.map((part) => part.digest()))
    }

    // Status
    /** @override */
    hasIntSucc(n: u32): boolean {
        assert(() => isU32(n), "n ∈ u32")
        return isU32(this.seq() + n)
    }

    /** @override */
    compareBase(other: SimpleDotPos): BaseOrdering {
        if (this.depth() > other.depth()) {
            return baseOrderingInversion[other.compareBase(this)]
        } else if (this.isEqual(other)) {
            return BaseOrdering.EQUAL
        } else {
            let i = 0
            let baseCmp: Ordering = Ordering.EQUAL
            while (i < this.depth() - 1 && baseCmp === Ordering.EQUAL) {
                baseCmp = this.parts[i].compare(other.parts[i])
                i++
            }
            if (baseCmp === Ordering.EQUAL) {
                baseCmp = this.parts[i].compareBase(other.parts[i])
            }

            switch (baseCmp) {
                case Ordering.BEFORE:
                    return BaseOrdering.BEFORE
                case Ordering.EQUAL:
                    if (this.depth() === other.depth()) {
                        return BaseOrdering.EQUAL
                    } else {
                        return BaseOrdering.PREFIXING
                    }
                default:
                    return BaseOrdering.AFTER
            }
        }
    }

    /** @override */
    isBaseEqual(other: SimpleDotPos): boolean {
        return this.compareBase(other) === BaseOrdering.EQUAL
    }

    /** @override */
    compare(other: SimpleDotPos): Ordering {
        if (this.depth() > other.depth()) {
            return orderingInversion[other.compare(this)]
        } else if (this.isEqual(other)) {
            return Ordering.EQUAL
        } else {
            let i = 0
            let cmp: Ordering
            do {
                cmp = this.parts[i].compare(other.parts[i])
                i++
            } while (i < this.depth() && cmp === Ordering.EQUAL)

            if (cmp === Ordering.EQUAL) {
                return compareU32(this.depth(), other.depth())
            } else {
                return cmp
            }
        }
    }

    /** @override */
    isEqual(other: SimpleDotPos): boolean {
        return this.replica() === other.replica() && this.seq() === other.seq()
    }
}
