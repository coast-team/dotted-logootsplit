/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { assert, heavyAssert } from "../core/assert"
import { Block, LengthBlock, BlockOrdering } from "../core/block"
import { BlockFactory } from "../core/blockfactory"
import { Concat } from "../core/concat"
import { Pos } from "../core/pos"
import { Insertion, Deletion } from "../core/localoperation"
import { isUint32, uint32 } from "../core/number"

export abstract class Linkable <P extends Pos<P>, E extends Concat<E>> {
    /**
     * @param right {@link Linkable#right }
     */
    constructor (right?: Cell<P, E>) {
        this.right = right
    }

// Access
    /**
     * Next cell.
     */
    right?: Cell<P, E>

    reduceBlock <U> (f: (acc: U, b: Block<P, E>) => U, prefix: U): U {
        if (this.right === undefined) {
            return prefix
        } else {
            const rBlock = this.right.block
            return this.right.reduceBlock(f, f(prefix, rBlock)) // Tail recursion
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
    protected insertRight (rblock: Block<P, E>): Cell<P, E> {
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
    insert (iBlock: Block<P, E>, index: uint32): Insertion<E>[] {
        assert(() => isUint32(index), "index ∈ uint32")

        if (this.right === undefined) {
            this.insertRight(iBlock)
            return [new Insertion(index, iBlock.items)]
        } else {
            const rBlock = this.right.block
            switch (rBlock.compare(iBlock)) {
                case BlockOrdering.BEFORE:
                    return this.right.insert(iBlock, index + rBlock.length)
                case BlockOrdering.PREPENDABLE: {
                    const insertions = this.right.insert(iBlock, index + rBlock.length)
                    // The right block of rBlock could be a splitting block
                    this.right = this.right.right
                    this.insert(rBlock, 0) // handle prepend
                    return insertions
                }
                case BlockOrdering.AFTER:
                    this.insertRight(iBlock)
                    return [new Insertion(index, iBlock.items)]
                case BlockOrdering.APPENDABLE:
                    this.right = this.right.right
                    this.insertRight(iBlock.append(rBlock))
                    return [new Insertion(index, iBlock.items)]
                case BlockOrdering.SPLITTING: {
                    const [lSplit, rSplit] = iBlock.splitWith(rBlock)
                    const rInsertions = this.right.insert(rSplit, index + lSplit.length + rBlock.length)
                    this.insertRight(lSplit)
                    return [new Insertion(index, lSplit.items), ...rInsertions]
                }
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = rBlock.splitWith(iBlock)
                    this.right = this.right.right
                    this.insertRight(lSplit)
                        .insertRight(iBlock)
                        .insertRight(rSplit)
                    return [new Insertion(index + lSplit.length, iBlock.items)]
                }
                case BlockOrdering.INCLUDED_BY: {
                    const [lRemaning, rRemaining] = iBlock.remove(rBlock)
                    let insertions: Insertion<E>[] = []
                    if (lRemaning !== undefined) {
                        this.right = this.right.right
                        insertions = [new Insertion(index, lRemaning.items)]
                        this.insertRight(lRemaning.append(rBlock))
                    }
                    if (rRemaining !== undefined) {
                        insertions = [
                            ...insertions,
                            ...this.insert(rRemaining, index)
                        ]
                    }
                    return insertions
                }
                case BlockOrdering.OVERLAPPING_BEFORE: {
                    const appendable = iBlock.appendable(rBlock)
                    return this.insert(appendable, index) // Tail recursion
                }
                case BlockOrdering.OVERLAPPING_AFTER: {
                    const prependable = iBlock.prependable(rBlock)
                    this.right = this.right.right
                    this.insertRight(prependable.append(rBlock))
                    return [new Insertion(index, prependable.items)]
                }
                default: //case BlockOrdering.Including, BlockOrdering.Equal:
                    return [] // already inserted
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
    insertAt (index: uint32, items: E, factory: BlockFactory<P>): [Block<P, E>, BlockFactory<P>] {
        assert(() => isUint32(index), "index ∈ uint32")
        assert(() => items.length > 0, "items.length > 0")

        let generated: [Block<P, E>, BlockFactory<P>]

        if (this.right === undefined) {
            if (this instanceof Cell) {
                generated = factory.after(this.block, items)
            } else {
                generated = factory.from(items)
            }
            this.insertRight(generated[0])
        } else {
            const rBlock = this.right.block

            if (index > rBlock.length) {
                generated = this.right.insertAt(index - rBlock.length, items, factory)
            } else if (index === rBlock.length) {
                generated = (this.right.right !== undefined)
                    ? factory.between(rBlock, items, this.right.right.block)
                    : factory.after(rBlock, items)
                this.insert(generated[0], 0) // handle append and prepend
            } else if (index === 0) {
                assert(() => this instanceof Sentinel,
                    "only Sentinel can insert at index 0")
                generated = factory.before(items, rBlock)
                this.insert(generated[0], 0) // handle prepend
            } else {
                const [lSplit, rSplit] = rBlock.splitAt(index)
                generated = factory.between(lSplit, items, rSplit)
                this.right = this.right.right // remove right
                this.insertRight(lSplit)
                    .insertRight(generated[0])
                    .insertRight(rSplit)
            }
        }
        return generated
    }

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt (index: uint32, length: uint32): LengthBlock<P>[] {
        assert(() => isUint32(index), "index ∈ uint32")
        assert(() => isUint32(length), "length ∈ uint32")
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
                    const removeds = this.removeAt(index, length - rBlock.length)
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
    remove (dBlock: LengthBlock<P> | Block<P, E>, index: uint32): Deletion[] {
        assert(() => isUint32(index), "index ∈ uint32")

        if (this.right !== undefined) {
            const rBlock = this.right.block
            switch (rBlock.compare(dBlock)) {
                case BlockOrdering.SPLITTING: // fall-through
                case BlockOrdering.BEFORE: {
                    const removals = this.right.remove(dBlock, index + rBlock.length)
                    const rIndex = index + rBlock.length
                    if (removals.length > 0 && removals[0].index === rIndex) {
                        this.right = this.right.right
                        this.insert(rBlock, 0) // handle append
                    }
                    return removals
                }
                case BlockOrdering.PREPENDABLE:
                    return this.right.remove(dBlock, index + rBlock.length) // tail recursion
                case BlockOrdering.INCLUDING: {
                    const removed = rBlock.intersection(dBlock)
                    const [lRemaning, rRemaning] = rBlock.remove(dBlock)
                    this.right = this.right.right
                    if (rRemaning !== undefined) {
                        this.insertRight(rRemaning)
                    }
                    let removalIndex = index
                    if (lRemaning !== undefined) {
                        this.insertRight(lRemaning)
                        removalIndex = removalIndex + lRemaning.length
                    }
                    return [new Deletion(removalIndex, dBlock.length)]
                }
                case BlockOrdering.EQUAL:
                    this.right = this.right.right
                    return [new Deletion(index, rBlock.length)]
                case BlockOrdering.INCLUDED_BY: {
                    // Append of the current block is handled in the first switch-case
                    this.right = this.right.right
                    const rRemovals = this.remove(dBlock, index)
                    return [new Deletion(index, rBlock.length), ...rRemovals]
                }
                case BlockOrdering.OVERLAPPING_BEFORE: {
                    const removed = rBlock.intersection(dBlock)
                    const remaining = rBlock.prependable(dBlock)
                    //const [remaining, ] = rBlock.remove(block) as [undefined, Block<P, E>]
                    //remaining = remaining as Block<P, E>
                    this.right = this.right.right
                    this.insertRight(remaining)
                    const removals = this.remove(dBlock, index + remaining.length)
                    return [new Deletion(index + remaining.length, removed.length)]
                }
                case BlockOrdering.OVERLAPPING_AFTER: {
                    const removed = rBlock.intersection(dBlock)
                    const remaining = rBlock.appendable(dBlock)
                    //const [, remaining] = rBlock.remove(block) as [undefined, Block<P, E>]
                    this.right = this.right.right
                    this.insertRight(remaining)
                    return [new Deletion(index, removed.length)]
                }
                //case BlockOrdering.After:
                //case BlockOrdering.Appendable:
                //case BlockOrdering.SplittedBy:
                default:
            }
        }
        return [] // already removed or not already inserted
    }
}

export class Sentinel <P extends Pos<P>, E extends Concat<E>> extends Linkable<P, E> {}

export class Cell <P extends Pos<P>, E extends Concat<E>> extends Linkable<P, E> {
    /**
     * @param block {@link Cell#block }
     * @param right {@link Linkable#right }
     */
    constructor (block: Block<P, E>, right?: Cell<P, E>) {
        heavyAssert(() => (right === undefined ||
                block.compare(right.block) === BlockOrdering.BEFORE),
            "block < right.block")
        super(right)
        this.block = block
    }

    /**
     * Block attached to this cell.
     */
    readonly block: Block<P, E>
}
