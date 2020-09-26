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
import { OpLinkedList, EditableOpLinkedList } from "./op-linked-list"
import { BlockFactory, BlockFactoryConstructor } from "../../core/block-factory"
import { assert } from "../../util/assert"
import {
    DeltaReplicatedList,
    DeltaEditableReplicatedList,
} from "../../core/delta-replicated-list"
import { FromPlain } from "../../util/data-validation"

export function opList<E extends Concat<E>>(): OpReplicatedList<E> {
    return OpLinkedList.empty<E>()
}

/**
 * @param f
 * @param itemsFromPlain
 * @param x candidate
 * @return operation-based AVL list from `x`, or undefined if `x` is mal-formed
 */
export const opListFromPlain = OpLinkedList.fromPlain

/**
 * @param factory block factory
 * @param v empty value (used for type inference)
 * @return operation-based empty linked list that cannot be locally modified
 */
export function OpEditableList<E extends Concat<E>>(
    factory: BlockFactory,
    v: E
): OpEditableReplicatedList<E> {
    assert(() => v.length === 0, "v must be empty")
    return EditableOpLinkedList.emptyWith<E>(factory)
}

/**
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export const opEditableListFromPlain = EditableOpLinkedList.fromPlain

/**
 * @return operation-based empty linked list that can be locally modified
 */
export function deltaList<E extends Concat<E>>(): DeltaReplicatedList<E> {
    return DeltaReplicatedList.from(opList())
}

/**
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export function deltaListFromPlain<E extends Concat<E>>(
    f: BlockFactoryConstructor,
    itemsFromPlain: FromPlain<E>
): FromPlain<DeltaReplicatedList<E>> {
    return DeltaReplicatedList.fromPlain(opListFromPlain(f, itemsFromPlain))
}

/**
 * @param factory block factory
 * @param v empty value (used for type inference)
 * @return delta-based empty linked list that can be locally modified
 */
export function deltaEditableList<E extends Concat<E>>(
    factory: BlockFactory,
    v: E
): DeltaEditableReplicatedList<E> {
    assert(() => v.length === 0, "v must be empty")
    return DeltaEditableReplicatedList.from(OpEditableList(factory, v))
}

/**
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export function deltaEditableListFromPlain<E extends Concat<E>>(
    f: BlockFactoryConstructor,
    itemsFromPlain: FromPlain<E>
): FromPlain<DeltaEditableReplicatedList<E>> {
    return DeltaEditableReplicatedList.fromPlain(
        opEditableListFromPlain(f, itemsFromPlain)
    )
}
