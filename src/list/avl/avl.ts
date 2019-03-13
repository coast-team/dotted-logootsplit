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
import { OpAvlList, EditableOpAvlList } from "./op-avl-list"
import { BlockFactory, BlockFactoryConstructor } from "../../core/block-factory"
import { assert } from "../../util/assert"
import {
    DeltaReplicatedList,
    DeltaEditableReplicatedList,
} from "../../core/delta-replicated-list"
import { DotPos } from "../../core/dot-pos"
import { FromPlain } from "../../util/data-validation"

/**
 * @return operation-based empty AVL list that cannot be locally modified
 */
export function opList<
    P extends Pos<P>,
    E extends Concat<E>
>(): OpReplicatedList<P, E> {
    return OpAvlList.empty<P, E>()
}

/**
 * @param f
 * @param itemsFromPlain
 * @param x candidate
 * @return operation-based AVL list from `x`, or undefined if `x` is mal-formed
 */
export const opListFromPlain = OpAvlList.fromPlain

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
    return EditableOpAvlList.emptyWith<P, E>(factory)
}

/**
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export const opEditableListFromPlain = EditableOpAvlList.fromPlain

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
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export function deltaListFromPlain<P extends DotPos<P>, E extends Concat<E>>(
    f: BlockFactoryConstructor<P>,
    itemsFromPlain: FromPlain<E>
): FromPlain<DeltaReplicatedList<P, E>> {
    return DeltaReplicatedList.fromPlain(opListFromPlain(f, itemsFromPlain))
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

/**
 * @param f
 * @param itemsFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export function deltaEditableListFromPlain<
    P extends DotPos<P>,
    E extends Concat<E>
>(
    f: BlockFactoryConstructor<P>,
    itemsFromPlain: FromPlain<E>
): FromPlain<DeltaEditableReplicatedList<P, E>> {
    return DeltaEditableReplicatedList.fromPlain(
        opEditableListFromPlain(f, itemsFromPlain)
    )
}
