import test from "ava"

import { IntervalOrdering, IntInterval } from "../../src/core/int-interval"

function twiInterval(ref: IntInterval): IntInterval {
    return IntInterval.fromLength(ref.lower, ref.length)
}

const from0to1 = IntInterval.fromLength(0, 2)
const from1to2 = IntInterval.fromLength(1, 2)
const from0to2 = IntInterval.fromLength(0, 3)
const singleton0 = IntInterval.fromLength(0, 1)
const singleton1 = IntInterval.fromLength(1, 1)
const singleton2 = IntInterval.fromLength(2, 1)

test("from-bounds", (t) => {
    t.deepEqual(IntInterval.fromBounds(0, 1), from0to1)
})

test("a-compare", (t) => {
    t.is(singleton0.compare(twiInterval(singleton0)), IntervalOrdering.EQUAL)

    t.is(singleton0.compare(from1to2), IntervalOrdering.PREPENDABLE)
    t.is(from1to2.compare(singleton0), IntervalOrdering.APPENDABLE)

    t.is(singleton0.compare(singleton2), IntervalOrdering.BEFORE)
    t.is(singleton2.compare(singleton0), IntervalOrdering.AFTER)

    t.is(from0to1.compare(from1to2), IntervalOrdering.OVERLAPPING_BEFORE)
    t.is(from1to2.compare(from0to1), IntervalOrdering.OVERLAPPING_AFTER)

    t.is(from0to1.compare(singleton0), IntervalOrdering.INCLUDING_LEFT)
    t.is(singleton0.compare(from0to1), IntervalOrdering.INCLUDED_LEFT_BY)

    t.is(from0to1.compare(singleton1), IntervalOrdering.INCLUDING_RIGHT)
    t.is(singleton1.compare(from0to1), IntervalOrdering.INCLUDED_RIGHT_BY)

    t.is(from0to2.compare(singleton1), IntervalOrdering.INCLUDING_MIDDLE)
    t.is(singleton1.compare(from0to2), IntervalOrdering.INCLUDED_MIDDLE_BY)
})

test("append", (t) => {
    t.deepEqual(singleton0.append(singleton1), from0to1)
})
