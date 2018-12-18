import test from "ava"

import { twinPositionPart } from "./position.testutil"

import { Ordering } from "../../src/core/ordering"
import { SimplePosPart } from "../../src/position/simplepospart"

const part001 = SimplePosPart.from(1, 0, 1)
const part010 = SimplePosPart.from(1, 1, 0)
const part100 = SimplePosPart.from(2, 0, 0)

test("compare", (t) => {
    // reflexivity
    t.is(part001.compare(twinPositionPart(part001)), Ordering.EQUAL)
    t.is(part010.compare(twinPositionPart(part010)), Ordering.EQUAL)
    t.is(part100.compare(twinPositionPart(part100)), Ordering.EQUAL)

    t.is(part001.compare(part010), Ordering.BEFORE)
    t.is(part010.compare(part100), Ordering.BEFORE)

    t.is(part010.compare(part001), Ordering.AFTER)
    t.is(part100.compare(part010), Ordering.AFTER)
})

test("compareBase", (t) => {
    // reflexivity
    t.is(part001.compareBase(twinPositionPart(part001)), Ordering.EQUAL)
    t.is(part010.compareBase(twinPositionPart(part010)), Ordering.EQUAL)
    t.is(part100.compareBase(twinPositionPart(part100)), Ordering.EQUAL)

    t.is(part001.compareBase(part010), Ordering.BEFORE)
    t.is(part010.compareBase(part100), Ordering.BEFORE)

    t.is(part010.compareBase(part001), Ordering.AFTER)
    t.is(part100.compareBase(part010), Ordering.AFTER)
})

test("asTuple", (t) => {
    const a = 1
    const b = 2
    const c = 3
    t.deepEqual(SimplePosPart.from(a, b, c).asTuple(), [a, b, c])
})
