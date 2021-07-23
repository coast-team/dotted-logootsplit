/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import type { u32 } from "../util/number.js"
import { hashCodeOf } from "../util/number.js"
import type { Anchor } from "./anchor.js"
import type { Block, LengthBlock } from "./block.js"
import type { Concat } from "./concat.js"
import type { Del } from "./del.js"
import type { Ins } from "./ins.js"

/**
 * List which can only be remotely updated using operations.
 * An operation must be delivered exactly once.
 * An insertion must be delivered before a removal that depends on.
 */
export abstract class OpReplicatedList<E extends Concat<E>> {
    // Access
    /**
     * Number of inserted items.
     */
    abstract readonly length: u32

    /**
     * @param f reducer that respectively accepts the accumulated value and
     *  the current block as first and second parameters. It returns the next
     *  accumulated value.
     * @param prefix initial value
     * @return accumulated value by reducing blocks from left to right
     *  in the list.
     */
    abstract reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U

    /**
     * @param prefix
     * @return Concatenated version prefixed by `prefix`.
     */
    concatenated(prefix: E): E {
        return this.reduceBlock((acc, b) => acc.concat(b.content), prefix)
    }

    /**
     * Non-cryptographic way to approximate object identity.
     * Do not take the blocks' content into account.
     */
    structuralHashCode(): u32 {
        return this.reduceBlock(
            (acc, b) => hashCodeOf([acc, b.structuralHashCode()]),
            0
        )
    }

    /**
     * @param index index where the anchor is
     * @param isAfter Is the anchor after `index`?
     * @return anchor at `index`.
     *  The anchor is sticked to the left psoition if isAfter is false.
     * Otherwise, it is sticked to the right psoition.
     */
    abstract anchorAt(index: u32, isAfter: boolean): Anchor

    /**
     * @param anchor
     * @return index of `anchor`.
     */
    abstract indexFrom(anchor: Anchor): u32

    /**
     * @param delta operation of insertion insertion
     * @return operations of insertion that can be played such that an
     *  insertion is not played a second time.
     */
    abstract insertable(delta: Block<E>): Block<E>[]

    // Modification
    /**
     * [Mutation]
     * Insert {@link delta } in the list.
     * An insertion must be played exactly once.
     *
     * @param delta opertaion of insertion.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     *  Thus local operations must be played from left to right.
     */
    abstract insert(delta: Block<E>): Ins<E>[]

    /**
     * [Mutation]
     * Remove {@link delta } from the list.
     * This operation is idempotent. You can play several times the same
     * deletion.
     * Note that a deltion should be played after the insertions of the elemnts.
     *
     * @param delta operation of deletion.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.s
     *  Thus local operations must be played from left to right.
     */
    abstract remove(delta: LengthBlock): Del[]

    /**
     * [Mutation]
     * Apply {@see OpReplicatedList#remove} or {@see OpReplicatedList#insert}
     * according to the type of `delta`.
     *
     * @param delta operation
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     *  Thus local operations must be played from left to right.
     */
    applyOp(delta: Block<E>): Ins<E>[]
    applyOp(delta: LengthBlock): Del[]
    applyOp(delta: LengthBlock | Block<E>): Del[] | Ins<E>[]
    applyOp(delta: LengthBlock | Block<E>): Del[] | Ins<E>[] {
        if (delta.isLengthBlock()) {
            return this.remove(delta)
        } else {
            return this.insert(delta)
        }
    }
}

/**
 * List which can be remotely and locally updated.
 * An operation must be delivered exactly once.
 * An insertion must be delivered before a removal that depends on.
 */
export interface OpEditableReplicatedList<E extends Concat<E>>
    extends OpReplicatedList<E> {
    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt(index: u32, items: E): Block<E>

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt(index: u32, length: u32): LengthBlock[]
}
