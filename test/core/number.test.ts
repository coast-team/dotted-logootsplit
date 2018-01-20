import test from "ava"

import {
    UINT32_BOTTOM,
    UINT32_TOP,
    isUint32,
    nextRandomUint32,
    compareUint32
} from "../../src/core/number"
import { Ordering } from "../../src/core/ordering"

test("safe-integers-are-not-uint32", (t) => {
    t.false(isUint32(Number.MIN_SAFE_INTEGER))
    t.false(isUint32(UINT32_BOTTOM - 1))
    t.false(isUint32(UINT32_TOP + 1))
    t.false(isUint32(Number.MAX_SAFE_INTEGER))
})

test("uint32-are-uint32", (t) => {
    t.true(isUint32(UINT32_BOTTOM))
    t.true(isUint32(1))
    t.true(isUint32(UINT32_TOP))
})

test("float-are-not-uint32", (t) => {
    t.false(isUint32(-1.2))
    t.false(isUint32(0.1))
    t.false(isUint32(1.2))
})

test("randomUint32-upper-bound-is-excluded", (t) => {
    // WARNING: No deterministric test (no seeded radom function)
    for (let i = 0; i < 100; i++) {
        t.is(nextRandomUint32(0, 1), 0)
    }
})

test("randomUint32-in-interval", (t) => {
    // WARNING: No deterministric test (no seeded radom function)
    for (let i = 0; i < 100; i++) {
        const r = nextRandomUint32(UINT32_BOTTOM, UINT32_TOP)
        t.true(isUint32(r) && r !== UINT32_TOP)
    }
})

test("compareInt", (t) => {
    t.is(compareUint32(1, 2), Ordering.BEFORE)
    t.is(compareUint32(2, 1), Ordering.AFTER)
    t.is(compareUint32(1, 1), Ordering.EQUAL)
    t.is(compareUint32(UINT32_BOTTOM, UINT32_BOTTOM + 1), Ordering.BEFORE)
    t.is(compareUint32(UINT32_TOP - 1, UINT32_TOP), Ordering.BEFORE)
})
