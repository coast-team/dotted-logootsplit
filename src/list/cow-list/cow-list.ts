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
    OpEditableReplicatedList,
} from "../../core/op-replicated-list"
import { BlockList, EditableBlockList } from "./block-list"
import { BlockFactory } from "../../core/block-factory"
import { assert } from "../../util/assert"
import {
    DeltaReplicatedList,
    DeltaEditableReplicatedList,
} from "../../core/delta-replicated-list"
import { DotPos } from "../../core/dot-pos"

/**
 * @return operation-based empty AVL list that cannot be locally modified
 */
export function opList<
    P extends Pos<P>,
    E extends Concat<E>
>(): OpReplicatedList<P, E> {
    return BlockList.empty<P, E>()
}

/**
 *  @param factory block factory
 * @param v empty value (used for type inference)
 * @return operation-based empty AVL list that can be locally modified
 */
export function opEditableList<P extends Pos<P>, E extends Concat<E>>(
    factory: BlockFactory<P>,
    v: E
): OpEditableReplicatedList<P, E> {
    assert(() => v.length === 0, "v must be empty")
    return EditableBlockList.emptyWith<P, E>(factory)
}

/**
 * @return delta-based empty AVL list that cannot be locally modified
 */
export function deltaList<
    P extends DotPos<P>,
    E extends Concat<E>
>(): DeltaReplicatedList<P, E> {
    return DeltaReplicatedList.from(opList())
}

/**
 * @param factory block factory
 * @param v empty value (used for type inference)
 * @return delta-based empty AVL list that can be locally modified
 */
export function deltaEditableList<P extends DotPos<P>, E extends Concat<E>>(
    factory: BlockFactory<P>,
    v: E
): DeltaEditableReplicatedList<P, E> {
    assert(() => v.length === 0, "v must be empty")
    return DeltaEditableReplicatedList.from(opEditableList(factory, v))
}
