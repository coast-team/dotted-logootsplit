/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../core/assert"
import { isObject, fromArray } from "../core/data-validation"
import {
    absoluteSubstraction,
    compareUint32,
    digestOf,
    isUint32,
    uint32,
    UINT32_BOTTOM,
    UINT32_TOP,
} from "../core/number"
import { Position, BaseOrdering, baseOrderingInversion } from "../core/position"
import { SimplePositionPart } from "./simplepositionpart"
import { Ordering, orderingInversion } from "../core/ordering"

/**
 * A position can be represented as a lexicographic list of
 * lexicographic triplets (priority, replica, seq).
 * Theses triplets are the parts of the position. The depth of a triplet
 * correponds to its 0-based index in the list.
 *
 * The dot (replica, seq) uniquely identifies the position.
 *
 * The set of positions is dense, hence you can always author a new position
 * between two distinct positions. A position can be generated between two
 * int-successive positions (see {@link Position}) by suffixing a new triplet
 * to the lower position.
 */
export class SimplePosition implements Position<SimplePosition> {
    /**
     * @param parts {@link SimplePosition#parts }
     */
    protected constructor (parts: ReadonlyArray<SimplePositionPart>) {
        assert(() => parts.length > 0, "parts must not be empty")
        this.parts = parts
    }

    /**
     * @param parts {@link SimplePosition#parts }
     *  The last part must be distinct of SimplePositionPart.BOTTOM and
     *  SimplePositionPart.TOP.
     * @return Position with {@link parts } as {@link SimplePosition#parts }.
     */
    static from (parts: ReadonlyArray<SimplePositionPart>): SimplePosition {
        const lastPart = parts[parts.length - 1]
        assert(() => lastPart.priority !== UINT32_BOTTOM && lastPart.priority !== UINT32_TOP,
            "priority ∉ {UINT32_BOTTOM, UINT32_TOP}")
        assert(() => lastPart.replica !== UINT32_TOP,
            "replica != UINT32_TOP. This is reserved for BOTTOM and TOP.")
        return new SimplePosition(parts)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain (x: unknown): SimplePosition | undefined {
        if (isObject<SimplePosition>(x) && Array.isArray(x.parts)) {
            const parts = fromArray(x.parts, SimplePositionPart.fromPlain)
            if (parts !== undefined) {
                const lastPart = parts[parts.length - 1]
                if (lastPart.priority !== UINT32_BOTTOM &&
                    lastPart.priority !== UINT32_TOP &&
                    lastPart.replica !== UINT32_TOP) {

                    return SimplePosition.from(parts)
                }
            }
        }
        return undefined
    }

    /**
     * Lowest position.
     */
    static readonly BOTTOM = new SimplePosition([SimplePositionPart.BOTTOM])

    /**
     * Greatest position.
     */
    static readonly TOP = new SimplePosition([SimplePositionPart.TOP])

// Derivation
    /**
     * @param seq The last seq of the new position
     * @return Position with the same base as this,
     *  but with a different seq
     */
    withSeq (seq: uint32): SimplePosition {
        assert(() => isUint32(seq), "offset ∈ uint32")
        const parts = [...this.parts]
        const lastIndex = parts.length - 1
        parts[lastIndex] = parts[lastIndex].withSeq(seq)
        return new SimplePosition(parts)
    }

    /** @override */
    intSuccessor (n: uint32): SimplePosition {
        assert(() => isUint32(n), "n ∈ uint32")
        assert(() => this.hasIntSuccessor(n), "this has a n-th successor")
        return this.withSeq(this.seq + n)
    }

// Access
    /**
     * Parts of this position.
     */
    readonly parts: ReadonlyArray<SimplePositionPart>

    /**
     * Last part of {@link SimplePositionPart#parts }.
     */
    get lastPart (): SimplePositionPart {
        return this.parts[this.parts.length - 1]
    }

    /**
     * Number of part in {@link SimplePositionPart#parts }.
     */
    get depth (): uint32 {
        return this.parts.length
    }

    /** @override */
    get replica (): uint32 {
        return this.lastPart.replica
    }

    /** @override */
    get seq (): uint32 {
        return this.lastPart.seq
    }

    /** @override */
    get blockIdentifier (): ReadonlyArray<uint32> {
        // TODO use a typed array and then a typeable array as return type?
        const result = this.parts.reduce((acc: uint32[], part) => (
                acc.concat(part.asTuple())
            ), [])
        result.pop() // remove last seq
        return result
    }

    /** @override */
    intDistance (other: SimplePosition): [uint32, Ordering] {
        if (this.depth > other.depth) {
            const [dist, order] = other.intDistance(this)
            return [dist, orderingInversion[order]]
        } else {
            heavyAssert(() => (
                (cmp) => cmp === BaseOrdering.PREFIXING ||
                    cmp === BaseOrdering.EQUAL
                )(this.compareBase(other)), "MARK")

            const otherSeq = other.parts[this.depth - 1].seq
            return [
                absoluteSubstraction(this.seq, otherSeq),
                compareUint32(this.seq, otherSeq)
            ]
        }
    }

    /**
     * Hash code.
     */
    get digest (): uint32 {
        return digestOf(this.parts.map((part) => part.digest))
    }

// Status
    /** @override */
    hasIntSuccessor (n: uint32): boolean {
        assert(() => isUint32(n), "n ∈ uint32")
        return isUint32(this.seq + n)
    }

    /** @override */
    compareBase (other: SimplePosition): BaseOrdering {
        if (this.depth > other.depth) {
            return baseOrderingInversion[other.compareBase(this)]
        } else if (this.replica === other.replica && this.seq === other.seq) {
            return BaseOrdering.EQUAL
        } else {
            let i = 0
            let baseCmp: Ordering = Ordering.EQUAL
            while (i < (this.depth - 1) && baseCmp === Ordering.EQUAL) {
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
                    if (this.depth === other.depth) {
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
    isBaseEqual (other: SimplePosition): boolean {
        return this.compareBase(other) === BaseOrdering.EQUAL
    }

    /** @override */
    compare (other: SimplePosition): Ordering {
        if (this.depth > other.depth) {
            return orderingInversion[other.compare(this)]
        } else if (this.isEqual(other)) {
            return Ordering.EQUAL
        } else {
            let i = 0
            let cmp: Ordering
            do {
                cmp = this.parts[i].compare(other.parts[i])
                i++
            } while (i < this.depth && cmp === Ordering.EQUAL)

            if (cmp === Ordering.EQUAL) {
                return compareUint32(this.depth, other.depth)
            } else {
                return cmp
            }
        }
    }

    /** @override */
    isEqual (other: SimplePosition): boolean {
        return this.replica === other.replica && this.seq === other.seq
    }
}
