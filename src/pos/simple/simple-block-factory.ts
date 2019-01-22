/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, AleaState } from "replayable-random"

import { assert, heavyAssert } from "../../core/assert"
import { isObject } from "../../core/data-validation"
import { SimplePos } from "./simple-pos"
import { SimplePosPart } from "./simple-pos-part"
import { isU32, u32, U32_TOP } from "../../core/number"
import { Ordering } from "../../core/ordering"
import { BlockFactory } from "../../core/block-factory"

/**
 * @param values
 * @param defaultValue value to emit once {@link values } were emitted.
 * @return Infinite stream of values.
 */
function *infiniteSequence <T>(values: ReadonlyArray<T>, defaultValue: T): IterableIterator<T> {
    for (const v of values) {
        yield v
    }
    while (true) {
        yield defaultValue
    }
}

/**
 * Factory of block with {@link SimplePos } as implementation of
 * {@link Pos}.
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class SimpleBlockFactory extends BlockFactory<SimplePos> {
    /**
     * @param posBounds {@link SimpleBlockFactory#replica }
     * @param seq {@link SimpleBlockFactory#seq }
     * @param randState random generator's state
     */
    constructor (replica: u32, seq: u32, randState: AleaState) {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP pos.")
        super(SimplePos)
        assert(() => isU32(seq), "seq ∈ u32")
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
    static from (replica: u32, globalSeed: string): SimpleBlockFactory {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP positions.")
        const seed = `${globalSeed}${replica}`
        const randState = alea.from(seed)
        return new SimpleBlockFactory(replica, 0, randState)
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain (x: unknown): SimpleBlockFactory | undefined {
        if (isObject<SimpleBlockFactory>(x) &&
            isU32(x.replica) && x.replica !== U32_TOP &&
            isU32(x.seq)) {

            // FIXME: check randState
            return new SimpleBlockFactory(x.replica, x.seq, x.randState as AleaState)
        }
        return undefined
    }

    // Access
    /** @Override */
    readonly replica: u32

    /** @Override */
    readonly seq: u32

    readonly randState: AleaState

    // Derivation
    /**
     * @param by
     * @param randState
     * @return Same factory, but with {@link SimpleBlockFactory#seq }
     * increased by {@link by } and {@link SimpleBlockFactory#randState }
     * replaced by {@link randState }
     */
    evolve (by: u32, randState: AleaState): SimpleBlockFactory {
        assert(() => isU32(by), "by ∈ u32")
        assert(() => isU32(this.seq + by), "no overflow")
        return new SimpleBlockFactory(this.replica, this.seq + by, randState)
    }

    /**
     * @param by
     * @return Same factory, but with {@link SimpleBlockFactory#seq }
     * increased by {@link by }
     */
    increasedSeq (by: u32): SimpleBlockFactory {
        assert(() => isU32(by), "by ∈ u32")
        assert(() => isU32(this.seq + by), "no overflow")
        return this.evolve(by, this.randState)
    }

    // Impl
    /** @override */
    posBetween (l: SimplePos, length: u32, u: SimplePos): [SimplePos, SimpleBlockFactory] {
        heavyAssert(() => l.compare(u) === Ordering.BEFORE, "l < u")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length is strictly positive")
        assert(() => isU32(this.seq + length), "no overflow")

        if (l.replica() === this.replica && (l.seq() + 1) === this.seq) {
            // Appendable
            return [l.intSucc(1), this.increasedSeq(length)]
        } else {
            const seqL = infiniteSequence(l.parts, SimplePosPart.BOTTOM)
            const seqU = infiniteSequence(u.parts, SimplePosPart.TOP)
            const parts: SimplePosPart[] = []

            let partL = seqL.next().value
            let partU = seqU.next().value
            while ((partU.priority - partL.priority) < 2) {
                // Cannot insert a new part between partL and partU
                if (partU.replica === partL.replica) {
                    // Split
                    parts.push(partL)
                } else {
                    parts.push(partL.withSeq(U32_TOP))
                }
                partL = seqL.next().value
                partU = seqU.next().value
            }
            const [priority, s] =
                alea.u32Between(partL.priority + 1, partU.priority)(this.randState)
                // priority ∈ ]tuple1.priority, tuple2.priority[
                // tuple1.priority exclusion ensures a dense set
            parts.push(SimplePosPart.from(priority, this.replica, this.seq))

            return [SimplePos.from(parts), this.evolve(length, s)]
        }
    }
}
