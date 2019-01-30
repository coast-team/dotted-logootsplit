// Copyright (c) 2018 Victorien Elvinger
//
// Licensed under the zlib license (https://opensource.org/licenses/zlib).
//
// This file is part of replayable-random
// (https://github.com/Conaclos/replayable-random)

/** @internal */
export type NonFunctionNames<T> = {
    [k in keyof T]: T[k] extends Function ? never : k
}[keyof T]

/** @internal */
export type Unknown<T> = { [k in NonFunctionNames<T>]?: unknown }

/**
 * Example:
 * Given `x: unknown`
 * `isObject<{ p: number }>(x) && typeof x.p === "number"`
 * enables to test if x is conforms to `{ p: number }`.
 *
 * @internal
 * @param x
 * @param Is `x' a non-null object?
 */
export const isObject = <T>(x: unknown): x is Unknown<T> =>
    typeof x === "object" && x !== null

export type FromPlain<T> = (x: unknown) => T | undefined

export function fromArray<T>(x: unknown[], f: FromPlain<T>): T[] | undefined {
    let result: T[] | undefined = new Array(x.length)
    let i = 0
    while (result !== undefined && i < x.length) {
        const o = f(x[i])
        if (o === undefined) {
            result = undefined
        } else {
            result[i] = o
            i++
        }
    }
    return result
}

export function or<A, B>(f: FromPlain<A>, g: FromPlain<B>): FromPlain<A | B> {
    return (x) => {
        const a = f(x)
        if (a !== undefined) {
            return a
        }
        return g(x)
    }
}
