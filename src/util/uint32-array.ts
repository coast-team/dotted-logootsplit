import type { u32 } from "./number.js"

/**
 * @param a
 * @param i index of the value
 * @param defaultVal returned value if `i` is not a valid index for `a`
 * @return `i`-th value of `a` or `defaultVal` if none.
 */
export const getDefault = (a: Uint32Array, i: u32, defaultVal: u32): u32 =>
    i < a.length ? a[i] : defaultVal

/**
 * @example
 * 2 === prefixLength(Uint32Array.of(1, 2, 3), Uint32Array.of(1, 2, 4))
 * 3 === prefixLength(Uint32Array.of(1, 2, 3), Uint32Array.of(1, 2, 3,4))
 *
 * @param a
 * @param b
 * @return length of the common prefix between `a` and `b`
 */
export const prefixLength = (a: Uint32Array, b: Uint32Array): u32 => {
    if (a === b) {
        return a.length
    } else {
        const minLen = Math.min(a.length, b.length)
        let i = 0
        while (i < minLen && a[i] === b[i]) {
            i++
        }
        return i
    }
}
