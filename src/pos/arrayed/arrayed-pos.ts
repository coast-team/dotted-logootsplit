/*
    Copyright (C) 2020  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../../util/assert"
import {
    absoluteSubstraction,
    compareU32,
    hashCodeOf,
    isU32,
    u32,
} from "../../util/number"
import { BaseOrdering } from "../../core/pos"
import { Ordering, orderingInversion } from "../../util/ordering"
import { DotPos } from "../../core/dot-pos"
import { getDefault, prefixLength } from "../../util/uint32-array"

/**
 * @final this class cannot be extended
 */
export class ArrayedPos implements DotPos<ArrayedPos> {
    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): ArrayedPos | undefined {
        if (Array.isArray(x) && x.every(isU32)) {
            const vs = Uint32Array.from(x)
            const baseLen = vs.length - 1
            const base = vs.subarray(0, baseLen)
            const offset = vs[baseLen]
            return new ArrayedPos(base, offset)
        }
        return undefined
    }

    readonly base: Uint32Array

    readonly offset: u32

    /**
     * @note you should never create a position on your own.
     *  Use a block factory instead.
     * @param base {@link ArrayedPos#base }
     */
    constructor(base: Uint32Array, offset: u32) {
        this.base = base
        this.offset = offset
    }

    seq(): u32 {
        return this.offset
    }

    // Derivation
    /**
     * @param offset The offset of the new position
     * @return Position with the same base, but with a different offset
     */
    withOffset(offset: u32): ArrayedPos {
        assert(() => isU32(offset), "offset ∈ u32")
        return new ArrayedPos(this.base, offset)
    }

    /** @override */
    intSucc(n: u32): ArrayedPos {
        assert(() => isU32(n), "n ∈ u32")
        assert(() => this.hasIntSucc(n), "this has a n-th successor")
        return this.withOffset(this.offset + n)
    }

    // Access
    /** @override */
    replica(): u32 {
        const base = this.base
        return base[base.length - 1]
    }

    /** @override */
    intDistance(other: ArrayedPos): readonly [u32, Ordering] {
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
                    : other.offset
            const offset = this.offset
            return [
                absoluteSubstraction(offset, otherIntermediateOffset),
                compareU32(offset, otherIntermediateOffset),
            ]
        }
    }

    /** @override */
    hashCode(): u32 {
        return (((hashCodeOf(this.base) * 17) >>> 0) + this.offset) >>> 0
    }

    /** @override */
    hasIntSucc(n: u32): boolean {
        return isU32(this.offset + n)
    }

    /** @override */
    compareBase(other: ArrayedPos): BaseOrdering {
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

    /** @override */
    compare(other: ArrayedPos): Ordering {
        const base = this.base
        const oBase = other.base
        const i = prefixLength(base, oBase)
        const v1 = getDefault(base, i, this.offset)
        const v2 = getDefault(oBase, i, other.offset)
        const cmp = compareU32(v1, v2)
        return cmp === Ordering.EQUAL
            ? compareU32(base.length, oBase.length)
            : cmp
    }

    protected toJSON(): readonly u32[] {
        const repr = Array.from(this.base)
        repr.push(this.offset)
        return repr
    }
}
