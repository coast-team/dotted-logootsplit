import test from "ava"

import { RangeOrdering, U32Range } from "../../src/core/u32-range"

function twiInterval(ref: U32Range): U32Range {
    return U32Range.fromLength(ref.lower, ref.length)
}

const from0to1 = U32Range.fromLength(0, 2)
const from1to2 = U32Range.fromLength(1, 2)
const from0to2 = U32Range.fromLength(0, 3)
const singleton0 = U32Range.fromLength(0, 1)
const singleton1 = U32Range.fromLength(1, 1)
const singleton2 = U32Range.fromLength(2, 1)

test("from-bounds", (t) => {
    t.deepEqual(U32Range.fromBounds(0, 1), from0to1)
})

test("a-compare", (t) => {
    t.is(singleton0.compare(twiInterval(singleton0)), RangeOrdering.EQUAL)

    t.is(singleton0.compare(from1to2), RangeOrdering.PREPENDABLE)
    t.is(from1to2.compare(singleton0), RangeOrdering.APPENDABLE)

    t.is(singleton0.compare(singleton2), RangeOrdering.BEFORE)
    t.is(singleton2.compare(singleton0), RangeOrdering.AFTER)

    t.is(from0to1.compare(from1to2), RangeOrdering.OVERLAPPING_BEFORE)
    t.is(from1to2.compare(from0to1), RangeOrdering.OVERLAPPING_AFTER)

    t.is(from0to1.compare(singleton0), RangeOrdering.INCLUDING_LEFT)
    t.is(singleton0.compare(from0to1), RangeOrdering.INCLUDED_LEFT_BY)

    t.is(from0to1.compare(singleton1), RangeOrdering.INCLUDING_RIGHT)
    t.is(singleton1.compare(from0to1), RangeOrdering.INCLUDED_RIGHT_BY)

    t.is(from0to2.compare(singleton1), RangeOrdering.INCLUDING_MIDDLE)
    t.is(singleton1.compare(from0to2), RangeOrdering.INCLUDED_MIDDLE_BY)
})

test("append", (t) => {
    t.deepEqual(singleton0.append(singleton1), from0to1)
})
