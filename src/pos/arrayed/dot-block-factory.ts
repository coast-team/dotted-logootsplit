/*
    Copyright (C) 2020  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, distrib, MutRand } from "replayable-random"

import { assert } from "../../util/assert"
import { isObject, FromPlain } from "../../util/data-validation"
import { ArrayedPos } from "./arrayed-pos"
import { isU32, u32, U32_BOTTOM, U32_TOP } from "../../util/number"
import { BlockFactory } from "../../core/block-factory"
import { Concat } from "../../core/concat"
import { Block } from "../../core/block"
import { getDefault, prefixLength } from "../../util/uint32-array"

/**
 * @param p
 * @param length length of the new base
 * @return a base initialized from `p`.
 */
const baseFrom = (p: ArrayedPos, length: u32): Uint32Array => {
    const base = new Uint32Array(length)
    base.set(p.base.subarray(0, length))
    if (base.length > p.base.length) {
        base[p.base.length] = p.offset
    }
    return base
}

const DEFAULT_SEQ = 1

const POS_EXTRENUM = {
    /**
     * Lowest position.
     */
    BOTTOM: new ArrayedPos(Uint32Array.of(U32_BOTTOM, U32_BOTTOM), U32_BOTTOM),

    /**
     * Greatest position.
     */
    TOP: new ArrayedPos(Uint32Array.of(U32_TOP, U32_TOP), U32_TOP),
} as const

/**
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class DotBlockFactory extends BlockFactory<ArrayedPos> {
    /**
     * The random generator is seeded with both globalSeed and replica.
     *
     * @param replica {@link DotBlockFactory#replica }
     * @param globalSeed Seed for predictable random generation.
     * @return New factory with 0 as {@link DotBlockFactory#seq }
     */
    static from(replica: u32, globalSeed: string): DotBlockFactory {
        assert(() => isU32(replica), "replica ∈ u32")
        const seed = `${globalSeed}${replica}`
        const randState = alea.mutFrom(seed)
        return new DotBlockFactory(replica, DEFAULT_SEQ, randState)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): DotBlockFactory | undefined {
        if (
            isObject<DotBlockFactory>(x) &&
            isU32(x.replica) &&
            x.replica !== U32_TOP &&
            isU32(x.seq) &&
            x.seq !== 0
        ) {
            const mutRand = alea.mutFromPlain(x.randState)
            if (mutRand !== undefined) {
                return new DotBlockFactory(x.replica, x.seq, mutRand)
            }
        }
        return undefined
    }

    /**
     * See {@link BlockFactoryConstructor#blockFromPlain}
     */
    static blockFromPlain<E extends Concat<E>>(
        g: FromPlain<E>
    ): FromPlain<Block<ArrayedPos, E>> {
        return undefined as any // FIXME
    }

    /**
     * @param posBounds {@link DotBlockFactory#replica }
     * @param seq {@link DotBlockFactory#seq }
     * @param randState random generator's state
     */
    private constructor(replica: u32, seq: u32, randState: MutRand) {
        super(POS_EXTRENUM)
        this.replica = replica
        this.seq = seq
        this.randState = randState
    }

    // Access
    /** @Override */
    readonly replica: u32

    /** @Override */
    seq: u32

    randState: MutRand

    /**
     * @return Deep copy of this.
     */
    copy(): DotBlockFactory {
        const copiedRand = alea.mutFromPlain(this.randState) as MutRand // FIXME
        return new DotBlockFactory(this.replica, this.seq, copiedRand)
    }

    /**
     * Increase {@link DotBlockFactory#seq } by {@link by }
     *
     * @param by
     */
    increaseSeq(by: u32): void {
        assert(() => isU32(by), "by ∈ u32")
        assert(() => isU32(this.seq + by), "no overflow")
        this.seq = this.seq + by
    }

    /**
     * @param l
     * @param u
     * @param Can a position be appended to `l` and before `u`?
     */
    protected isAppendable(l: ArrayedPos, u: ArrayedPos): boolean {
        const lReplicaIndex = l.base.length - 1
        return (
            l !== POS_EXTRENUM.BOTTOM &&
            l.base[lReplicaIndex] === this.replica &&
            (u === POS_EXTRENUM.TOP ||
                this.replica !== getDefault(u.base, lReplicaIndex, U32_TOP) ||
                l.offset > getDefault(u.base, lReplicaIndex + 1, u.offset))
        )
    }

    protected toJSON(): unknown {
        return {
            replica: this.replica,
            seq: this.seq,
            randState: this.randState,
        }
    }

    // Impl
    /** @override */
    posBetween(l: ArrayedPos, length: u32, u: ArrayedPos): ArrayedPos {
        let result
        if (this.isAppendable(l, u)) {
            result = l.withOffset(this.seq)
        } else {
            const lBase = l.base
            const uBase = u.base

            let i = prefixLength(lBase, uBase)
            if (
                i === lBase.length &&
                i < uBase.length &&
                l.offset === uBase[i]
            ) {
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
            result = new ArrayedPos(base, this.seq)
        }
        this.seq = this.seq + length
        return result
    }
}
