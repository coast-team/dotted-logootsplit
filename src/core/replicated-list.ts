/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Block, LengthBlock } from "./block"
import { Concat } from "./concat"
import { Pos } from "./pos"
import { Insertion, Deletion } from "./local-operation"
import { u32 } from "./number"

/**
 * List which can only be remotely updated using deltas.
 */
export interface ReadonlyReplicatedList<P extends Pos<P>, E extends Concat<E>> {
    /**
     * Number of inserted items.
     */
    readonly length: u32

    /**
     * @param prefix
     * @return Concatenated version prefixed by {@link prefix }.
     */
    readonly concatenated: (prefix: E) => E

    /**
     * Hash code.
     * Note that the content is not take into account.
     */
    readonly structuralDigest: () => u32

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

    readonly insert: (delta: Block<P, E>) => Insertion<E>[]

    readonly remove: (delta: LengthBlock<P>) => Deletion[]
}

/**
 * List which can be remotely and locally updated.
 */
export interface ReplicatedList<P extends Pos<P>, E extends Concat<E>>
    extends ReadonlyReplicatedList<P, E> {
    /**
     * [Mutation]
     * Insert {@link items } at {@link index}.
     *
     * @param index 0-based index; Where to insert.
     * @param items elements to insert.
     * @return Delta which represents the insertion.
     */
    insertAt: (index: u32, items: E) => Block<P, E>

    /**
     * [Mutation]
     * Remove a number of {@link length } elements from {@link index }
     *
     * @param index 0-based index.
     * @param length Number of elements to remove.
     * @return Delta which represents the deletion.
     */
    removeAt: (index: u32, length: u32) => LengthBlock<P>[]
}
