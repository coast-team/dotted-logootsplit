/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Block, LengthBlock } from "./block"
import { Concat } from "./concat"
import { Pos } from "./pos"
import { Ins, Del } from "./local-operation"
import { u32, digestOf } from "../util/number"

/**
 * List which can only be remotely updated using operations.
 * An operation must be delivered exactly once.
 * An insertion must be delivered before a removal that depends on.
 */
export abstract class OpReplicatedList<P extends Pos<P>, E extends Concat<E>> {
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
    abstract reduceBlock<U>(f: (acc: U, b: Block<P, E>) => U, prefix: U): U

    /**
     * @param prefix
     * @return Concatenated version prefixed by `prefix`.
     */
    concatenated(prefix: E): E {
        return this.reduceBlock((acc, b) => acc.concat(b.content), prefix)
    }

    /**
     * Hash code.
     * Note that the content is not take into account.
     */
    structuralDigest(): u32 {
        return this.reduceBlock(
            (acc, b) => digestOf([acc, b.structuralDigest()]),
            0
        )
    }

    /**
     * @param delta operation of insertion insertion
     * @return operations of insertion that can be played such that an
     *  insertion is not played a second time.
     */
    abstract insertable(delta: Block<P, E>): Block<P, E>[]

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
    abstract insert(delta: Block<P, E>): Ins<E>[]

    /**
     * [Mutation]
     * Remove {@link delta } from the list.
     * This operation is idempotent. You can play several times the same
     * deletion.
     * Note that a deltion should be played after the insertions of the elemnts.
     *
     * @param delta operation of deletion.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     *  Thus local operations must be played from left to right.
     */
    abstract remove(delta: LengthBlock<P>): Del[]

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
    applyOp(delta: Block<P, E>): Ins<E>[]
    applyOp(delta: LengthBlock<P>): Del[]
    applyOp(delta: LengthBlock<P> | Block<P, E>): Del[] | Ins<E>[]
    applyOp(delta: LengthBlock<P> | Block<P, E>): Del[] | Ins<E>[] {
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
export interface OpEditableReplicatedList<
    P extends Pos<P>,
    E extends Concat<E>
> extends OpReplicatedList<P, E> {
    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt(index: u32, items: E): Block<P, E>

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt(index: u32, length: u32): LengthBlock<P>[]
}
