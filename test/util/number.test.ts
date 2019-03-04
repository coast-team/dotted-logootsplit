import test from "ava"

import { U32_BOTTOM, U32_TOP, isU32, compareU32 } from "../../src/util/number"
import { Ordering } from "../../src/util/ordering"

test("safe-integers-are-not-uint32", (t) => {
    t.false(isU32(Number.MIN_SAFE_INTEGER))
    t.false(isU32(U32_BOTTOM - 1))
    t.false(isU32(U32_TOP + 1))
    t.false(isU32(Number.MAX_SAFE_INTEGER))
})

test("uint32-are-uint32", (t) => {
    t.true(isU32(U32_BOTTOM))
    t.true(isU32(1))
    t.true(isU32(U32_TOP))
})

test("float-are-not-uint32", (t) => {
    t.false(isU32(-1.2))
    t.false(isU32(0.1))
    t.false(isU32(1.2))
})

test("compareInt", (t) => {
    t.is(compareU32(1, 2), Ordering.BEFORE)
    t.is(compareU32(2, 1), Ordering.AFTER)
    t.is(compareU32(1, 1), Ordering.EQUAL)
    t.is(compareU32(U32_BOTTOM, U32_BOTTOM + 1), Ordering.BEFORE)
    t.is(compareU32(U32_TOP - 1, U32_TOP), Ordering.BEFORE)
})
