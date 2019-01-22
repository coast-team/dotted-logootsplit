/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { flags } from "../flags"

export type Lazy<T> = () => T

/**
 * @param test lazy test
 * @param msg reported message if {@link test } fails.
 */
export function assert(test: Lazy<boolean>, msg: string): void {
    if (flags.assertionsEnabled) {
        if (flags.failFastEnabled) {
            console.assert(test(), msg)
        } else {
            console.error(`Assertion failed: ${msg}`)
        }
    }
}

/**
 * @param test lazy test which may be hurt the performance.
 * @param msg reported message if {@link test } fails.
 */
export function heavyAssert(test: Lazy<boolean>, msg: string): void {
    if (flags.heavyAssertionsEnabled) {
        assert(test, msg)
    }
}

/**
 * @param o
 * @return read-only {@link o }
 */
export const readonly = <T>(o: T): Readonly<T> => o
