/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * Possible relation between two elements in a totally ordered set.
 */
export const enum Ordering {
    BEFORE = -1, // <
    EQUAL = 0, // =
    AFTER = 1, // >
}

/**
 * Inversion of Ordering.
 *
 * @example
 * orderingInversion[Ordering.BEFORE] === Ordering.AFTER
 */
export const orderingInversion = {
    [Ordering.BEFORE]: Ordering.AFTER,
    [Ordering.EQUAL]: Ordering.EQUAL,
    [Ordering.AFTER]: Ordering.BEFORE,
} as const

/**
 * compareBoolean(false, true) === Ordering.EQUAL
 * @param a
 * @param b
 * @return a [ordering relation] b
 */
export const compareBoolean = (a: boolean, b: boolean): Ordering => {
    if (a === b) {
        return Ordering.EQUAL
    } else if (b) {
        return Ordering.AFTER
    } else {
        return Ordering.BEFORE
    }
}

/**
 * @example
 * lexCompareOrdering(Ordering.Equal, r2) == r2
 * lexCompareOrdering(Ordering.Before, _) == Ordering.Before
 * lexCompareOrdering(Ordering.After, _) == Ordering.After
 *
 * @param r1
 * @param r2
 * @return Lexicographic order between {@link r1} and {@link r2}.
 */
export const lexCompareOrdering = (r1: Ordering, r2: Ordering): Ordering => {
    return r1 !== Ordering.EQUAL ? r1 : r2
}
