/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, distrib, MutRand } from "replayable-random"

import { assert, heavyAssert } from "../../util/assert"
import { isObject, FromPlain } from "../../util/data-validation"
import { SimpleDotPos } from "./simple-dot-pos"
import { SimpleDotPosPart } from "./simple-dot-pos-part"
import { isU32, u32, U32_TOP } from "../../util/number"
import { Ordering } from "../../util/ordering"
import { BlockFactory } from "../../core/block-factory"
import { Concat } from "../../core/concat"
import { Block } from "../../core/block"

/**
 * @param values
 * @param defaultValue value to emit once {@link values } were emitted.
 * @return Infinite stream of values.
 */
function* infiniteSequence<T>(
    values: ReadonlyArray<T>,
    defaultValue: T
): IterableIterator<T> {
    for (const v of values) {
        yield v
    }
    while (true) {
        yield defaultValue
    }
}

const DEFAULT_SEQ = 1

/**
 * Factory of block with {@link SimplePos } as implementation of
 * {@link Pos}.
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class SimpleDotBlockFactory extends BlockFactory<SimpleDotPos> {
    /**
     * @param posBounds {@link SimpleBlockFactory#replica }
     * @param seq {@link SimpleBlockFactory#seq }
     * @param randState random generator's state
     */
    protected constructor(replica: u32, seq: u32, randState: MutRand) {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => isU32(seq), "seq ∈ u32")
        assert(() => seq !== 0, "seq != 0. Reserved for convenience")
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP pos."
        )
        super(SimpleDotPos)
        this.replica = replica
        this.seq = seq
        this.randState = randState
    }

    /**
     * The random generator is seeded with both globalSeed and replica.
     *
     * @param replica {@link SimpleBlockFactory#replica }
     * @param globalSeed Seed for predictable random generation.
     * @return New factory with 0 as {@link SimpleBlockFactory#seq }
     */
    static from(replica: u32, globalSeed: string): SimpleDotBlockFactory {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP positions."
        )
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
     * See {@link BlockFactoryConstructor#blockFromPlain}
     */
    static blockFromPlain<E extends Concat<E>>(
        g: FromPlain<E>
    ): FromPlain<Block<SimpleDotPos, E>> {
        return Block.fromPlain(SimpleDotPos.fromPlain, g)
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
    copy(): SimpleDotBlockFactory {
        const copiedRand = alea.mutFromPlain(this.randState) as MutRand // FIXME
        return new SimpleDotBlockFactory(this.replica, this.seq, copiedRand)
    }

    /**
     * Increase {@link SimpleBlockFactory#seq } by {@link by }
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
     * @param Can `length` be appended to `l`?
     */
    isAppendable(l: SimpleDotPos, length: u32): boolean {
        return l.replica() === this.replica && l.seq() + 1 === this.seq
    }

    // Impl
    /** @override */
    posBetween(l: SimpleDotPos, length: u32, u: SimpleDotPos): SimpleDotPos {
        heavyAssert(() => l.compare(u) === Ordering.BEFORE, "l < u")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length is strictly positive")
        assert(() => isU32(this.seq + length), "no overflow")

        if (this.isAppendable(l, length)) {
            this.seq = this.seq + length
            return l.intSucc(1)
        } else {
            const seqL = infiniteSequence(l.parts, SimpleDotPosPart.BOTTOM)
            const seqU = infiniteSequence(u.parts, SimpleDotPosPart.TOP)
            const parts: SimpleDotPosPart[] = []

            let partL = seqL.next().value
            let partU = seqU.next().value
            while (partU.priority - partL.priority < 2) {
                // Cannot insert a new part between partL and partU
                if (partL.replica === partU.replica) {
                    // Split
                    parts.push(partL)
                } else {
                    parts.push(partL.withSeq(U32_TOP)) // Let room for append
                }
                partL = seqL.next().value
                partU = seqU.next().value
            }
            const priority = distrib.mutU32Between(partL.priority + 1)(
                partU.priority
            )(this.randState)
            // priority ∈ ]partL.priority, partU.priority[
            // partL.priority exclusion ensures a dense set
            parts.push(SimpleDotPosPart.from(priority, this.replica, this.seq))

            this.seq = this.seq + length
            return SimpleDotPos.from(parts)
        }
    }
}
