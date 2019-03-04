/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../../util/assert"
import { isObject, fromArray } from "../../util/data-validation"
import {
    absoluteSubstraction,
    compareU32,
    digestOf,
    isU32,
    u32,
    U32_BOTTOM,
    U32_TOP,
} from "../../util/number"
import { BaseOrdering, baseOrderingInversion } from "../../core/pos"
import { SimplePosPart } from "./simple-pos-part"
import { Ordering, orderingInversion } from "../../util/ordering"
import { Pos } from "../../core/pos"

/**
 * @final this class cannot be extended
 *
 * A position can be represented as a lexicographic list of
 * lexicographic quadruples (priority, replica, nth, offset).
 * Theses triplets are the parts of the position.
 *
 * The triplet (replica, nth, offset) uniquely identifies the position.
 *
 * The set of positions is dense, hence you can always author a new position
 * between two distinct positions. A position can be generated between two
 * int-successive positions (see {@link Pos}) by suffixing a new triplet
 * to the lower position.
 */
export class SimplePos implements Pos<SimplePos> {
    /**
     * Lowest position.
     */
    static readonly BOTTOM = new SimplePos([SimplePosPart.BOTTOM])

    /**
     * Greatest position.
     */
    static readonly TOP = new SimplePos([SimplePosPart.TOP])

    /**
     * @param parts {@link SimplePos#parts }
     *  The last part must be distinct of SimplePosPart.BOTTOM and
     *  SimplePosPart.TOP.
     * @return Position with {@link parts } as {@link SimplePos#parts }.
     */
    static from(parts: ReadonlyArray<SimplePosPart>): SimplePos {
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
        return new SimplePos(parts)
    }

    /**
     * @note {@link SimplePos#BOTTOM } and {@link SimplePos#TOP }
     * are not valid candidates.
     *
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): SimplePos | undefined {
        if (isObject<SimplePos>(x) && Array.isArray(x.parts)) {
            const parts = fromArray(x.parts, SimplePosPart.fromPlain)
            if (parts !== undefined && parts.length > 0) {
                const lastPart = parts[parts.length - 1]
                if (
                    lastPart.priority !== U32_BOTTOM &&
                    lastPart.priority !== U32_TOP &&
                    lastPart.replica !== U32_TOP
                ) {
                    return SimplePos.from(parts)
                }
            }
        }
        return undefined
    }

    /**
     * Parts of this position.
     */
    readonly parts: ReadonlyArray<SimplePosPart>

    /**
     * @param parts {@link SimplePos#parts }
     */
    private constructor(parts: ReadonlyArray<SimplePosPart>) {
        assert(() => parts.length > 0, "parts must not be empty")
        this.parts = parts
    }

    // Derivation
    /**
     * @param offset The offset of the new position
     * @return Position with the same base, but with a different offset
     */
    withOffset(offset: u32): SimplePos {
        assert(() => isU32(offset), "offset ∈ u32")
        const parts = [...this.parts]
        const lastIndex = parts.length - 1
        parts[lastIndex] = parts[lastIndex].withOffset(offset)
        return new SimplePos(parts)
    }

    /**
     * @param n 0-based index.
     * @return `n`-th integer predecessor of this.
     */
    intPred(n: u32): SimplePos {
        assert(() => isU32(n), "n ∈ u32")
        assert(() => this.hasIntPred(n), "this has a n-th predecessor")
        return this.withOffset(this.offset() - n)
    }

    /** @override */
    intSucc(n: u32): SimplePos {
        assert(() => isU32(n), "n ∈ u32")
        assert(() => this.hasIntSucc(n), "this has a n-th successor")
        return this.withOffset(this.offset() + n)
    }

    // Access
    /**
     * Last part of {@link SimplePosPart#parts }.
     */
    lastPart(): SimplePosPart {
        return this.parts[this.parts.length - 1]
    }

    /**
     * Number of part in {@link SimplePosPart#parts }.
     */
    depth(): u32 {
        return this.parts.length
    }

    /**
     * Globally unique identifier of the author which generated this position.
     */
    replica(): u32 {
        return this.lastPart().replica
    }

    /**
     * Each position is generated for the `nth` generated block.
     * The pair (replica, nth) globally and uniquely identifies a block.
     */
    nth(): u32 {
        return this.lastPart().nth
    }

    /**
     * Offset of the position in the block.
     */
    offset(): u32 {
        return this.lastPart().offset
    }

    /** @override */
    intDistance(other: SimplePos): [u32, Ordering] {
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

            const otherIntermediateOffset = other.parts[this.depth() - 1].offset
            const offset = this.offset()
            return [
                absoluteSubstraction(offset, otherIntermediateOffset),
                compareU32(offset, otherIntermediateOffset),
            ]
        }
    }

    /** @override */
    digest(): u32 {
        return digestOf(this.parts.map((part) => part.digest()))
    }

    // Status
    /**
     * hasIntPred(0) is always true.
     *
     * See also {@link Pos#hasIntSucc }.
     *
     * @param n 0-based index.
     * @return is there a {@link n } -th integer predecessor?
     */
    hasIntPred(n: u32): boolean {
        assert(() => isU32(n), "n ∈ u32")
        return isU32(this.offset() - n)
    }

    /** @override */
    hasIntSucc(n: u32): boolean {
        assert(() => isU32(n), "n ∈ u32")
        return isU32(this.offset() + n)
    }

    /** @override */
    compareBase(other: SimplePos): BaseOrdering {
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
    isBaseEqual(other: SimplePos): boolean {
        return this.compareBase(other) === BaseOrdering.EQUAL
    }

    /** @override */
    compare(other: SimplePos): Ordering {
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
    isEqual(other: SimplePos): boolean {
        return (
            this.replica() === other.replica() &&
            this.nth() === other.nth() &&
            this.offset() === other.offset()
        )
    }
}
