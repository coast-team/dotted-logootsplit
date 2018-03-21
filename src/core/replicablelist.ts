/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Block, LengthBlock } from "../core/block"
import { Concatenable } from "../core/concatenable"
import { Position } from "../core/position"
import { Insertion, Deletion } from "../core/localoperation"

/**
 * List which can only be remotely updated using deltas.
 */
export interface ReadonlyReplicatableList <P extends Position<P>, E extends Concatenable<E>> {
    /**
     * Number of inserted items.
     */
    readonly length: uint32

    /**
     * @param prefix
     * @return Concatenated version prefixed by {@link prefix }.
     */
    readonly concatenated: (prefix: E) => E

    /**
     * Hash code.
     * Note that the content is not take into account.
     */
    readonly structuralDigest: uint32

// Modification
    /**
     * [Mutation]
     *
     * @param delta
     *  if {@link delta } is a {@link Block }, it is an insertion.
     *  if {@link delta } is a {@link LengthBlock }, it is a removal.
     * @return Performed modifications in terms of local operations.
     *  The n+1 -th operation depends on the n -th operation.
     */
    readonly applyDelta: {
        (delta: LengthBlock<P>): Deletion[]
        (delta: Block<P, E>): Insertion<E>[]
    }
}

/**
 * List which can be remotely and locally updated.
 */
export interface ReplicatableList <P extends Position<P>, E extends Concatenable<E>>
    extends ReadonlyReplicatableList<P, E> {

    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt: (index: uint32, items: E) => Block<P, E>

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt: (index: uint32, length: uint32) => LengthBlock<P>[]
}
