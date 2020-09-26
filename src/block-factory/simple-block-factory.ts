/*
    Copyright (C) 2020  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, distrib, MutRand } from "replayable-random"
import { BlockFactory } from "../core/block-factory"
import { Pos } from "../core/pos"
import { assert } from "../util/assert"
import { isObject } from "../util/data-validation"
import { isU32, u32, U32_BOTTOM, U32_TOP } from "../util/number"
import { getDefault, prefixLength } from "../util/uint32-array"

/**
 * @param p
 * @param length length of the new base
 * @return a base initialized from `p`.
 */
const baseFrom = (p: Pos, length: u32): Uint32Array => {
    const base = new Uint32Array(length)
    base.set(p.base.subarray(0, length))
    if (base.length > p.base.length) {
        base[p.base.length] = p.seq
    }
    return base
}

const DEFAULT_SEQ = 1

/**
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class SimpleDotBlockFactory extends BlockFactory {
    /**
     * The random generator is seeded with both globalSeed and replica.
     *
     * @param replica {@link DotBlockFactory#replica }
     * @param globalSeed Seed for predictable random generation.
     * @return New factory with 0 as {@link DotBlockFactory#seq }
     */
    static from(replica: u32, globalSeed: string): SimpleDotBlockFactory {
        assert(() => isU32(replica), "replica ∈ u32")
        const seed = `${globalSeed}${replica}`
        const randState = alea.mutFrom(seed)
        return new SimpleDotBlockFactory(replica, DEFAULT_SEQ, randState)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): SimpleDotBlockFactory | undefined {
        if (
            isObject<SimpleDotBlockFactory>(x) &&
            isU32(x.replica) &&
            x.replica !== U32_TOP &&
            isU32(x.seq) &&
            x.seq !== 0
        ) {
            const mutRand = alea.mutFromPlain(x.randState)
            if (mutRand !== undefined) {
                return new SimpleDotBlockFactory(x.replica, x.seq, mutRand)
            }
        }
        return undefined
    }

    /**
     * @param posBounds {@link DotBlockFactory#replica }
     * @param seq {@link DotBlockFactory#seq }
     * @param randState random generator's state
     */
    private constructor(replica: u32, seq: u32, randState: MutRand) {
        super(replica, seq)
        this.randState = randState
    }

    // Access
    randState: MutRand

    /**
     * @return Deep copy of this.
     */
    copy(): SimpleDotBlockFactory {
        const copiedRand = alea.mutFromPlain(this.randState) as MutRand // FIXME
        return new SimpleDotBlockFactory(this.replica, this.seq, copiedRand)
    }

    /**
     * @param l
     * @param u
     * @param Can a position be appended to `l` and before `u`?
     */
    protected isAppendable(l: Pos, u: Pos): boolean {
        const lReplicaIndex = l.base.length - 1
        return (
            l !== Pos.BOTTOM &&
            l.base[lReplicaIndex] === this.replica &&
            (u === Pos.TOP ||
                this.replica !== getDefault(u.base, lReplicaIndex, U32_TOP) ||
                l.seq > getDefault(u.base, lReplicaIndex + 1, u.seq))
        )
    }

    // Impl
    /** @override */
    posBetween(l: Pos, length: u32, u: Pos): Pos {
        if (this.isAppendable(l, u)) {
            return l.withOffset(this.seq)
        } else {
            const lBase = l.base
            const uBase = u.base

            let i = prefixLength(lBase, uBase)
            if (i === lBase.length && i < uBase.length && l.seq === uBase[i]) {
                // l is a prefix of u
                i++
                while (uBase[i] === U32_BOTTOM) {
                    // last priority is always distinct of U32_BOTTOM
                    i = i + 3
                }
            }

            i = i - (i % 3) // go to the priority of last distinct tuples
            let lPriority = getDefault(lBase, i, U32_BOTTOM)
            let uPriority = getDefault(uBase, i, U32_TOP)
            if (uPriority - lPriority < 2) {
                // Cannot generate a new priority between
                i = i + 3
                lPriority = getDefault(lBase, i, U32_BOTTOM)
                uPriority = U32_TOP
            }

            const base = baseFrom(l, i + 2)
            const priority = distrib.mutU32Between(lPriority + 1)(uPriority)(
                this.randState
            )
            base[i] = priority
            base[i + 1] = this.replica
            return new Pos(base, this.seq)
        }
    }
}
