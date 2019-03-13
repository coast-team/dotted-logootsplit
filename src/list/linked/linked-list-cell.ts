/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../../util/assert"
import { Block, LengthBlock, BlockOrdering } from "../../core/block"
import { BlockFactory } from "../../core/block-factory"
import { Concat } from "../../core/concat"
import { Pos } from "../../core/pos"
import { Ins, Del } from "../../core/local-operation"
import { isU32, u32 } from "../../util/number"
import { FromPlain, isObject } from "../../util/data-validation"

export abstract class Linkable<P extends Pos<P>, E extends Concat<E>> {
    /**
     * Next cell
     */
    right?: Cell<P, E>

    /**
     * @param right Next cell.
     */
    constructor(right?: Cell<P, E>) {
        this.right = right
    }

    // Access
    /**
     * @param f reducer that respectively accepts the accumulated value and
     *  the current block as first and second parameters. It returns the next
     *  accumulated value.
     * @param prefix initial value
     * @return accumulated value by reducing blocks from left to right
     *  in the list.
     */
    reduceBlock<U>(f: (acc: U, b: Block<P, E>) => U, prefix: U): U {
        if (this.right === undefined) {
            return prefix
        } else {
            const rBlock = this.right.block
            return this.right.reduceBlock(f, f(prefix, rBlock)) // Tail recursion
        }
    }

    /**
     * @param iBlock
     * @return segments of `iBlock` that can be inserted in the current
     *  sub-list.
     */
    insertable(iBlock: Block<P, E>): Block<P, E>[] {
        if (this.right === undefined) {
            return [iBlock]
        } else {
            const rBlock = this.right.block
            switch (iBlock.compare(rBlock)) {
                case BlockOrdering.PREPENDABLE:
                case BlockOrdering.BEFORE:
                case BlockOrdering.SPLITTING:
                    return [iBlock]
                case BlockOrdering.APPENDABLE:
                case BlockOrdering.AFTER:
                    return this.right.insertable(iBlock)
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = iBlock.splitWith(rBlock)
                    const rIns = this.right.insertable(rSplit)
                    return [lSplit].concat(rIns)
                }
                case BlockOrdering.INCLUDING_RIGHT:
                case BlockOrdering.OVERLAPPING_BEFORE:
                    return [iBlock.prependable(rBlock)]
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.OVERLAPPING_AFTER:
                    return this.right.insertable(iBlock.appendable(rBlock))
                case BlockOrdering.INCLUDING_MIDDLE: {
                    const lIns = [iBlock.prependable(rBlock)]
                    const rIns = this.right.insertable(
                        iBlock.appendable(rBlock)
                    )
                    return lIns.concat(rIns)
                }
                case BlockOrdering.INCLUDED_MIDDLE_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.EQUAL:
                    return []
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
    }

    // Modification
    /**
     * [Mutation]
     * Insert {@link rblock } to right and preserve the chain.
     *
     * @param rblock block to insert.
     * @return inserted cell with {@link rblock } as content.
     */
    protected insertRight(rblock: Block<P, E>): Cell<P, E> {
        this.right = new Cell(rblock, this.right)
        return this.right
    }

    /**
     * [Mutation]
     * Insert the parts of {@link iBlock } which are not already inserted.
     *
     * @param iBlock block to insert.
     * @param index 0-based index
     * @return Performed modifications in terms of local insertions.
     *  The n+1 -th insertion depends on the effect of the n -th insertion.
     */
    insert(iBlock: Block<P, E>, index: u32): Ins<E>[] {
        assert(() => isU32(index), "index ∈ u32")

        if (this.right === undefined) {
            this.insertRight(iBlock)
            return [new Ins(index, iBlock.content)]
        } else {
            const rBlock = this.right.block
            switch (rBlock.compare(iBlock)) {
                case BlockOrdering.BEFORE:
                    return this.right.insert(iBlock, index + rBlock.length)
                case BlockOrdering.PREPENDABLE: {
                    const insertions = this.right.insert(
                        iBlock,
                        index + rBlock.length
                    )
                    // The right block of rBlock could be a splitting block
                    this.right = this.right.right
                    this.insert(rBlock, 0) // handle prepend
                    return insertions
                }
                case BlockOrdering.AFTER:
                    this.insertRight(iBlock)
                    return [new Ins(index, iBlock.content)]
                case BlockOrdering.APPENDABLE:
                    this.right = this.right.right
                    this.insertRight(iBlock.append(rBlock))
                    return [new Ins(index, iBlock.content)]
                case BlockOrdering.SPLITTING: {
                    const [lSplit, rSplit] = iBlock.splitWith(rBlock)
                    const rInsertions = this.right.insert(
                        rSplit,
                        index + lSplit.length + rBlock.length
                    )
                    this.insertRight(lSplit)
                    return [new Ins(index, lSplit.content), ...rInsertions]
                }
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = rBlock.splitWith(iBlock)
                    this.right = this.right.right
                    this.insertRight(lSplit)
                        .insertRight(iBlock)
                        .insertRight(rSplit)
                    return [new Ins(index + lSplit.length, iBlock.content)]
                }
                case BlockOrdering.OVERLAPPING_BEFORE:
                case BlockOrdering.OVERLAPPING_AFTER:
                case BlockOrdering.INCLUDED_MIDDLE_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.INCLUDING_MIDDLE:
                case BlockOrdering.INCLUDING_RIGHT:
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.EQUAL:
                    throw new Error(
                        "inserted block intersects with one or more existing blocks"
                    )
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
    }

    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @param factory strategy of block generation.
     * @return Delta which represents the insertion.
     */
    insertAt(index: u32, items: E, factory: BlockFactory<P>): Block<P, E> {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => items.length > 0, "items.length > 0")

        let iBlock: Block<P, E>

        if (this.right === undefined) {
            if (this instanceof Cell) {
                iBlock = factory.after(this.block, items)
            } else {
                iBlock = factory.from(items)
            }
            this.insertRight(iBlock)
        } else {
            const rBlock = this.right.block

            if (index > rBlock.length) {
                iBlock = this.right.insertAt(
                    index - rBlock.length,
                    items,
                    factory
                )
            } else if (index === rBlock.length) {
                iBlock =
                    this.right.right !== undefined
                        ? factory.between(rBlock, items, this.right.right.block)
                        : factory.after(rBlock, items)
                this.insert(iBlock, 0) // handle append and prepend
            } else if (index === 0) {
                assert(
                    () => this instanceof Sentinel,
                    "only Sentinel can insert at index 0"
                )
                iBlock = factory.before(items, rBlock)
                this.insert(iBlock, 0) // handle prepend
            } else {
                const [lSplit, rSplit] = rBlock.splitAt(index)
                iBlock = factory.between(lSplit, items, rSplit)
                this.right = this.right.right // remove right
                this.insertRight(lSplit)
                    .insertRight(iBlock)
                    .insertRight(rSplit)
            }
        }
        return iBlock
    }

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt(index: u32, length: u32): LengthBlock<P>[] {
        assert(() => isU32(index), "index ∈ u32")
        assert(() => isU32(length), "length ∈ u32")
        assert(() => length > 0, "length > 0")

        if (this.right !== undefined) {
            const rBlock = this.right.block

            if (index > rBlock.length) {
                return this.right.removeAt(index - rBlock.length, length)
            } else if (index === rBlock.length) {
                const removeds = this.right.removeAt(0, length)
                this.right = this.right.right
                this.insert(rBlock, 0) // handle append
                return removeds
            } else if (index !== 0) {
                const [lSplit, rSplit] = rBlock.splitAt(index)
                this.right = this.right.right
                const newRight = this.insertRight(lSplit)
                newRight.insertRight(rSplit)
                return newRight.removeAt(index - lSplit.length, length)
            } else {
                if (rBlock.length === length) {
                    this.right = this.right.right
                    return [rBlock.toLengthBlock()]
                } else if (rBlock.length < length) {
                    this.right = this.right.right
                    const removeds = this.removeAt(
                        index,
                        length - rBlock.length
                    )
                    return [rBlock.toLengthBlock(), ...removeds]
                } else {
                    const [lSplit, rSplit] = rBlock.splitAt(length)
                    this.right = this.right.right
                    this.insertRight(rSplit)
                    return [lSplit.toLengthBlock()]
                }
            }
        } else {
            return []
        }
    }

    /**
     * [Mutation]
     * Remove {@link dBlock }.
     * @param dBlock block to remove.
     * @param index index of the current block in the chain.
     * @return Performed modifications in terms of local deletions.
     *  The n+1 -th deletion depends on the n -th deletion.
     */
    remove(dBlock: LengthBlock<P> | Block<P, E>, index: u32): Del[] {
        assert(() => isU32(index), "index ∈ u32")

        if (this.right !== undefined) {
            const rBlock = this.right.block
            switch (rBlock.compare(dBlock)) {
                case BlockOrdering.SPLITTING: // fall-through
                case BlockOrdering.BEFORE: {
                    const removals = this.right.remove(
                        dBlock,
                        index + rBlock.length
                    )
                    const rIndex = index + rBlock.length
                    if (removals.length > 0 && removals[0].index === rIndex) {
                        this.right = this.right.right
                        this.insert(rBlock, 0) // handle append
                    }
                    return removals
                }
                case BlockOrdering.PREPENDABLE:
                    return this.right.remove(dBlock, index + rBlock.length) // tail recursion
                case BlockOrdering.INCLUDING_LEFT: {
                    const rRemaning = rBlock.appendable(dBlock)
                    this.right = this.right.right
                    this.insertRight(rRemaning)
                    return [new Del(index, dBlock.length)]
                }
                case BlockOrdering.INCLUDING_RIGHT: {
                    const lRemaning = rBlock.prependable(dBlock)
                    this.right = this.right.right
                    this.insertRight(lRemaning)
                    return [new Del(index + lRemaning.length, dBlock.length)]
                }
                case BlockOrdering.INCLUDING_MIDDLE: {
                    const rRemaning = rBlock.appendable(dBlock)
                    const lRemaning = rBlock.prependable(dBlock)
                    this.right = this.right.right
                    this.insertRight(lRemaning).insertRight(rRemaning)
                    return [new Del(index + lRemaning.length, dBlock.length)]
                }
                case BlockOrdering.EQUAL:
                    this.right = this.right.right
                    return [new Del(index, rBlock.length)]
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_MIDDLE_BY: {
                    // Append of the current block is handled in the first switch-case
                    this.right = this.right.right
                    const rRemovals = this.remove(dBlock, index)
                    return [new Del(index, rBlock.length), ...rRemovals]
                }
                case BlockOrdering.OVERLAPPING_BEFORE: {
                    const removed = rBlock.intersection(dBlock)
                    const remaining = rBlock.prependable(dBlock)
                    //const [remaining, ] = rBlock.remove(block) as [undefined, Block<P, E>]
                    //remaining = remaining as Block<P, E>
                    this.right = this.right.right
                    this.insertRight(remaining)
                    this.remove(dBlock, index + remaining.length)
                    return [new Del(index + remaining.length, removed.length)]
                }
                case BlockOrdering.OVERLAPPING_AFTER: {
                    const removed = rBlock.intersection(dBlock)
                    const remaining = rBlock.appendable(dBlock)
                    //const [, remaining] = rBlock.remove(block) as [undefined, Block<P, E>]
                    this.right = this.right.right
                    this.insertRight(remaining)
                    return [new Del(index, removed.length)]
                }
                case BlockOrdering.AFTER:
                case BlockOrdering.APPENDABLE:
                case BlockOrdering.SPLITTED_BY:
                    break
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
        return [] // already removed or not already inserted
    }
}

export class Sentinel<P extends Pos<P>, E extends Concat<E>> extends Linkable<
    P,
    E
> {
    /**
     * @param blockFromPlain
     * @return function that accepts a value and returns a Sentinel from
     *  the value, or undefined if the value is mal-formed
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        blockFromPlain: FromPlain<Block<P, E>>
    ): FromPlain<Sentinel<P, E>> {
        return (x) => {
            if (isObject<Linkable<P, E>>(x)) {
                let right: Cell<P, E> | undefined
                if (x.right !== undefined) {
                    right = Cell.fromPlain(blockFromPlain)(x.right)
                    if (right === undefined) {
                        return undefined
                    }
                }
                return new Sentinel(right)
            }
            return undefined
        }
    }
}

export class Cell<P extends Pos<P>, E extends Concat<E>> extends Linkable<
    P,
    E
> {
    /**
     * @param blockFromPlain
     * @return function that accepts a value and returns a Cell from
     *  the value, or undefined if the value is mal-formed
     */
    static fromPlain<P extends Pos<P>, E extends Concat<E>>(
        blockFromPlain: FromPlain<Block<P, E>>
    ): FromPlain<Cell<P, E>> {
        return (x) => {
            if (isObject<Cell<P, E>>(x)) {
                const block = blockFromPlain(x.block)
                let right: Cell<P, E> | undefined
                if (x.right !== undefined) {
                    right = Cell.fromPlain(blockFromPlain)(x.right)
                    if (right === undefined) {
                        return undefined
                    }
                }
                if (block !== undefined) {
                    return new Cell(block, right)
                }
            }
            return undefined
        }
    }

    /**
     * @param block {@link Cell#block }
     * @param right {@link Linkable#right }
     */
    constructor(block: Block<P, E>, right: Cell<P, E> | undefined) {
        heavyAssert(
            () =>
                right === undefined ||
                block.compare(right.block) === BlockOrdering.BEFORE,
            "block < right.block"
        )
        super(right)
        this.block = block
    }

    /**
     * Block attached to this cell.
     */
    readonly block: Block<P, E>
}
