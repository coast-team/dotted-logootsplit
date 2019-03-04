/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { alea, distrib, MutRand } from "replayable-random"

import { assert, heavyAssert } from "../../util/assert"
import { isObject, FromPlain } from "../../util/data-validation"
import { SimplePos } from "./simple-pos"
import { SimplePosPart } from "./simple-pos-part"
import { isU32, u32, U32_TOP } from "../../util/number"
import { Ordering } from "../../util/ordering"
import { BlockFactory } from "../../core/block-factory"
import { Concat } from "../../core/concat"
import { Block } from "../../core/block"
import { U32Range } from "../../core/u32-range"

const U32_MID = 0x7fff_ffff

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

export interface SimpleBlockFactoryJSON {
    readonly replica: u32

    readonly seq: u32

    readonly randState: MutRand

    readonly generated: Array<[u32, [U32Range, u32]]>
}

/**
 * Factory of block with {@link SimplePos } as implementation of
 * {@link Pos}.
 * The strategy of generation is to genearte random positions between two
 * defined positions.
 */
export class SimpleBlockFactory extends BlockFactory<SimplePos> {
    /**
     * The random generator is seeded with both globalSee>eplica.
     *
     * @param replica {@link SimpleBlockFactory#replica }>
     * @param globalSeed Seed for predictable random generation.
     * @return New factory with 0 as {@link SimpleBlockFactory#seq }
     */
    static from(replica: u32, globalSeed: string): SimpleBlockFactory {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP positions."
        )
        const seed = `${globalSeed}${replica}`
        const randState = alea.mutFrom(seed)
        return new SimpleBlockFactory(replica, 0, randState, new Map())
    }

    /**
     * @param x candidate
     * @return object from `x', or undefined if `x' is not valid.
     */
    static fromPlain(x: unknown): SimpleBlockFactory | undefined {
        if (
            isObject<SimpleBlockFactoryJSON>(x) &&
            isU32(x.replica) &&
            x.replica !== U32_TOP &&
            isU32(x.seq) &&
            x.generated instanceof Array
        ) {
            const generated = x.generated
                .map(
                    (y: unknown): [u32, [U32Range, u32]] | undefined => {
                        if (
                            y instanceof Array &&
                            y.length === 2 &&
                            isU32(y[0]) &&
                            y[1] instanceof Array &&
                            y[1].length === 2 &&
                            isU32(y[1][1])
                        ) {
                            const [key, [maybeRange, removalCOunt]] = y
                            const range = U32Range.fromPlain(maybeRange)
                            if (range !== undefined) {
                                return [key, [range, removalCOunt]]
                            }
                        }
                        return undefined
                    }
                )
                .filter((e): e is [u32, [U32Range, u32]] => e !== undefined)
            const mutG = alea.mutFromPlain(x.randState)
            if (x.generated.length === generated.length && mutG !== undefined) {
                // FIXME: check randState
                return new SimpleBlockFactory(
                    x.replica,
                    x.seq,
                    mutG,
                    new Map(generated)
                )
            }
        }
        return undefined
    }

    /**
     * See {@link BlockFactoryConstructor#blockFromPlain}
     */
    static blockFromPlain<E extends Concat<E>>(
        g: FromPlain<E>
    ): FromPlain<Block<SimplePos, E>> {
        return Block.fromPlain(SimplePos.fromPlain, g)
    }

    /** @Override */
    readonly replica: u32

    /** @Override */
    seq: u32

    randState: MutRand

    /**
     * Positions already generated.
     * This is kept to prevent double generation of the same positions.
     */
    readonly generated: Map<u32, [U32Range, u32]>

    /**
     * @param posBounds {@link SimpleBlockFactory#replica }
     * @param seq {@link SimpleBlockFactory#seq }
     * @param randState random generator's state
     */
    protected constructor(
        replica: u32,
        seq: u32,
        randState: MutRand,
        generated: Map<u32, [U32Range, u32]>
    ) {
        assert(() => isU32(replica), "replica ∈ u32")
        assert(() => isU32(seq), "seq ∈ u32")
        assert(
            () => replica !== U32_TOP,
            "replica != U32_TOP. This is reserved for BOTTOM and TOP pos."
        )
        super(SimplePos)
        this.replica = replica
        this.seq = seq
        this.randState = randState
        this.generated = generated
    }

    // Access
    /**
     * @return Deep copy of this.
     */
    copy(): SimpleBlockFactory {
        const copiedRand = alea.mutFromPlain(this.randState) as MutRand // FIXME
        return new SimpleBlockFactory(
            this.replica,
            this.seq,
            copiedRand,
            new Map(this.generated)
        )
    }

    toJSON(): SimpleBlockFactoryJSON {
        return {
            replica: this.replica,
            seq: this.seq,
            randState: this.randState,
            generated: Array.from(this.generated),
        }
    }

    // Status
    isAppendable(l: SimplePos, length: u32): boolean {
        const gen = this.generated.get(l.nth())
        return (
            l.replica() === this.replica &&
            l.hasIntSucc(length) && // enough room for last pos
            gen !== undefined &&
            gen[0].upper() === l.offset()
        )
    }

    isPrependable(length: u32, u: SimplePos): boolean {
        const gen = this.generated.get(u.nth())
        return (
            u.replica() === this.replica &&
            u.hasIntPred(length) && // enough room for first pos
            gen !== undefined &&
            gen[0].lower === u.offset()
        )
    }

    // Modification
    register(l: SimplePos, length: u32): void {
        const registeredRange = U32Range.fromLength(l.offset(), length)

        const gen = this.generated.get(l.nth())
        if (gen !== undefined) {
            let merged
            if (gen[0].lower < registeredRange.lower) {
                merged = gen[0].append(registeredRange)
            } else {
                merged = registeredRange.append(gen[0])
            }
            gen[0] = merged // mutation
        } else {
            this.generated.set(l.nth(), [registeredRange, 0])
        }
    }

    /** @override */
    garbageCollectPos(l: SimplePos, length: u32): void {
        const nth = l.nth()
        const gen = this.generated.get(nth)
        if (l.replica() === this.replica && gen !== undefined) {
            gen[1] = gen[1] + length
            if (gen[0].length === gen[1]) {
                this.generated.delete(nth)
                if (nth === this.seq) {
                    this.seq++ // prevent double generation of positions
                }
            }
        }
    }

    // Impl
    /** @override */
    posBetween(l: SimplePos, length: u32, u: SimplePos): SimplePos {
        heavyAssert(() => l.compare(u) === Ordering.BEFORE, "l < u")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length is strictly positive")
        assert(() => isU32(this.seq + length), "no overflow")

        let result
        if (this.isAppendable(l, length)) {
            result = l.intSucc(1)
        } else if (this.isPrependable(length, u)) {
            result = u.intPred(length)
        } else {
            const seqL = infiniteSequence(l.parts, SimplePosPart.BOTTOM)
            const seqU = infiniteSequence(u.parts, SimplePosPart.TOP)
            const parts: SimplePosPart[] = []

            let partL = seqL.next().value
            let partU = seqU.next().value
            while (partU.priority - partL.priority < 2) {
                // Cannot insert a new part between partL and partU
                if (partL.replica === partU.replica) {
                    // Split
                    parts.push(partL)
                } else {
                    parts.push(partL.withOffset(U32_TOP)) // Let room for append
                }
                partL = seqL.next().value
                partU = seqU.next().value
            }
            const priority = distrib.mutU32Between(partL.priority + 1)(
                partU.priority
            )(this.randState)
            // priority ∈ ]partL.priority, partU.priority[
            // partL.priority exclusion ensures a dense set
            parts.push(
                SimplePosPart.from(priority, this.replica, this.seq, U32_MID)
            )

            this.seq++ // a new block was generated
            result = SimplePos.from(parts)
        }
        this.register(result, length)
        return result
    }
}
