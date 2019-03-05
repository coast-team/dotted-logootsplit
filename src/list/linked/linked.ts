/*
    Copyright (C) 2019  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Pos } from "../../core/pos"
import { Concat } from "../../core/concat"
import {
    OpReplicatedList,
    EditableOpReplicatedList,
} from "../../core/op-replicated-list"
import { OpLinkedList, EditableOpLinkedList } from "./op-linked-list"
import { BlockFactory } from "../../core/block-factory"
import { assert } from "../../util/assert"
import {
    DeltaReplicatedList,
    EditableDeltaReplicatedList,
} from "../../core/delta-replicated-list"
import { DotPos } from "../../core/dot-pos"

export function opList<
    P extends Pos<P>,
    E extends Concat<E>
>(): OpReplicatedList<P, E> {
    return OpLinkedList.empty<P, E>()
}

/**
 * @param factory block factory
 * @param v empty value (used for type inference)
 * @return operation-based empty linked list that cannot be locally modified
 */
export function OpEditableList<P extends Pos<P>, E extends Concat<E>>(
    factory: BlockFactory<P>,
    v: E
): EditableOpReplicatedList<P, E> {
    assert(() => v.length === 0, "v must be empty")
    return EditableOpLinkedList.emptyWith<P, E>(factory)
}

/**
 * @return operation-based empty linked list that can be locally modified
 */
export function deltaList<
    P extends DotPos<P>,
    E extends Concat<E>
>(): DeltaReplicatedList<P, E> {
    return new DeltaReplicatedList(opList())
}

/**
 * @param factory block factory
 * @param v empty value (used for type inference)
 * @return delta-based empty linked list that can be locally modified
 */
export function deltaEditableList<P extends DotPos<P>, E extends Concat<E>>(
    factory: BlockFactory<P>,
    v: E
): EditableDeltaReplicatedList<P, E> {
    assert(() => v.length === 0, "v must be empty")
    return new EditableDeltaReplicatedList(OpEditableList(factory, v))
}
