/*
    Copyright (C) 2020  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../util/assert.js"
import type { u32 } from "../util/number.js"
import {
    absoluteSubstraction,
    compareU32,
    hashCodeOf,
    isU32,
    U32_BOTTOM,
    U32_TOP,
} from "../util/number.js"
import { Ordering, orderingInversion } from "../util/ordering.js"
import { getDefault, prefixLength } from "../util/uint32-array.js"

/**
 * Possible relation between two position bases.
 */
export const enum BaseOrdering {
    BEFORE = -2,
    PREFIXING = -1,
    EQUAL = 0,
    PREFIXED_BY = 1,
    AFTER = 2,
}

const EMPTY_BASE = new Uint32Array(0)

/**
 * @final this class cannot be extended
 *
 * The set of positions is a dense totally ordered set.
 * The dot (replica, seq) uniquely identifies the position.
 *
 * A position can be represented as a lexcigraphic ordered list of hexadecimal.
 * The list without the last element is called the base of the position.
 * For instance:
 * p = [1, e, 3]
 * q = [1, e, 4]
 * r = [1, e, 4, 8]
 * p, q have the same base [1, e], and p < q
 * q, r have not the same base, and q < r.
 * However the base of q prefixes the base of r.
 *
 * Alternatively, a position can be represented as a positional hexadecimal.
 * p = .1e3 * 16^3
 * q = .1e4 * 16^3
 * r = .1e48 * 16^4
 *
 * Given a position, its n-th integer successor corresponds to the position plus
 * n. For example, q is the 1-th int successor of p. We say that the integer
 * distance between p and q is 1. Note that the integer distance from p to r is
 * approximated to 1.
 *
 * In documentation p.intSuccessor(n) can be shorten by p+n.
 */
export class Pos {
    /**
     * Lowest position.
     * All positions are greater or equal to this position.
     */
    static BOTTOM = new Pos(EMPTY_BASE, U32_BOTTOM)

    /**
     * Greatest position.
     * All positions are lower or equal to this position.
     */
    static TOP = new Pos(EMPTY_BASE, U32_TOP)

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): Pos | undefined {
        if (Array.isArray(x) && x.every(isU32)) {
            const vs = Uint32Array.from(x)
            const baseLen = vs.length - 1
            const base = vs.subarray(0, baseLen)
            const offset = vs[baseLen]
            return new Pos(base, offset)
        }
        return undefined
    }

    readonly base: Uint32Array

    /**
     * When was generated this position.
     *
     * For convenience seq must be strictly positive.
     * This enables to use `0` as default value in causal contexts.
     */
    readonly seq: u32

    /**
     * @note you should never create a position on your own.
     *  Use a block factory instead.
     * @param base {@link ArrayedPos#base }
     */
    constructor(base: Uint32Array, offset: u32) {
        assert(() => isU32(offset), "offset ∈ u32")
        this.base = base
        this.seq = offset
        assert(() => Pos.TOP?.compare(this) !== Ordering.BEFORE, "this <= TOP")
    }

    // Derivation
    /**
     * @param offset The offset of the new position
     * @return Position with the same base, but with a different offset
     */
    withOffset(offset: u32): Pos {
        assert(() => isU32(offset), "offset ∈ u32")
        return new Pos(this.base, offset)
    }

    /**
     * @param n 0-based index.
     * @return {@link n } -th integer successor of this.
     */
    intSucc(n: u32): Pos {
        assert(() => isU32(n), "n ∈ u32")
        assert(() => this.hasIntSucc(n), "this has a n-th successor")
        return this.withOffset(this.seq + n)
    }

    // Access
    // Access
    /**
     * Globally unique identifier of the author which generated this position.
     */
    replica(): u32 {
        const base = this.base
        return base[base.length - 1]
    }

    /**
     * @example
     * p.intDistance(p.intSuccessor(n)) == [n, Ordering.BEFORE]
     * p.intDistance(p) == [0, Ordering.EQUAL]
     * p.intSuccessor(n).intDistance(p) == [n, Ordering.AFTER]
     *
     * @param other
     *      this.compareBase(other) == BaseOrdering.PREFIXING |
     *          BaseOrdering.EQUAL | BaseOrdering.PREFIXED_BY
     * @return Integer distance from this to {@link other } and
     *  order between this and {@link other }.
     */
    intDistance(other: Pos): readonly [u32, Ordering] {
        if (this.base.length > other.base.length) {
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

            const otherIntermediateOffset =
                other.base.length > this.base.length
                    ? other.base[this.base.length]
                    : other.seq
            const offset = this.seq
            return [
                absoluteSubstraction(offset, otherIntermediateOffset),
                compareU32(offset, otherIntermediateOffset),
            ]
        }
    }

    /**
     * Non-cryptographic way to approximate object identity.
     */
    hashCode(): u32 {
        return (((hashCodeOf(this.base) * 17) >>> 0) + this.seq) >>> 0
    }

    // Status
    /**
     * hasIntSucc(0) is always true.
     *
     * See also {@link Pos#intSucc }.
     *
     * @param n 0-based index.
     * @return is there a {@link n } -th integer successor?
     */
    hasIntSucc(n: u32): boolean {
        assert(() => isU32(n), "n ∈ u32")
        return isU32(this.seq + n)
    }

    /**
     * @param other
     * @return base of this [Order relation] base of {@link other }.
     */
    compareBase(other: Pos): BaseOrdering {
        const base = this.base
        const baseLen = base.length
        const oBase = other.base
        const oBaseLen = oBase.length
        const i = prefixLength(base, oBase)
        if (i < baseLen && i < oBaseLen) {
            if (base[i] < oBase[i]) {
                return BaseOrdering.BEFORE
            } else {
                return BaseOrdering.AFTER
            }
        } else {
            if (baseLen === oBaseLen) {
                return BaseOrdering.EQUAL
            } else if (baseLen < oBaseLen) {
                return BaseOrdering.PREFIXING
            } else {
                return BaseOrdering.PREFIXED_BY
            }
        }
    }

    /**
     * @example
     * a.compare(b) == Ordering.Before if a < b
     *
     * @param other
     * @return this [Order relation] {@link other}.
     */
    compare(other: Pos): Ordering {
        const base = this.base
        const oBase = other.base
        const i = prefixLength(base, oBase)
        const v1 = getDefault(base, i, this.seq)
        const v2 = getDefault(oBase, i, other.seq)
        const cmp = compareU32(v1, v2)
        return cmp === Ordering.EQUAL
            ? compareU32(base.length, oBase.length)
            : cmp
    }

    protected toJSON(): readonly u32[] {
        const repr = Array.from(this.base)
        repr.push(this.seq)
        return repr
    }
}
