import test from "ava"

import { twinPositionPart } from "./pos.testutil"

import { Ordering } from "../../../src/core/ordering"
import { SimplePosPart } from "../../../src/pos/simple/simple-pos-part"

const part101 = SimplePosPart.from(1, 0, 1)
const part110 = SimplePosPart.from(1, 1, 0)
const part200 = SimplePosPart.from(2, 0, 0)

test("compare", (t) => {
    // reflexivity
    t.is(part101.compare(twinPositionPart(part101)), Ordering.EQUAL)
    t.is(part110.compare(twinPositionPart(part110)), Ordering.EQUAL)
    t.is(part200.compare(twinPositionPart(part200)), Ordering.EQUAL)

    t.is(part101.compare(part110), Ordering.BEFORE)
    t.is(part110.compare(part200), Ordering.BEFORE)

    t.is(part110.compare(part101), Ordering.AFTER)
    t.is(part200.compare(part110), Ordering.AFTER)
})

test("compareBase", (t) => {
    // reflexivity
    t.is(part101.compareBase(twinPositionPart(part101)), Ordering.EQUAL)
    t.is(part110.compareBase(twinPositionPart(part110)), Ordering.EQUAL)
    t.is(part200.compareBase(twinPositionPart(part200)), Ordering.EQUAL)

    t.is(part101.compareBase(part110), Ordering.BEFORE)
    t.is(part110.compareBase(part200), Ordering.BEFORE)

    t.is(part110.compareBase(part101), Ordering.AFTER)
    t.is(part200.compareBase(part110), Ordering.AFTER)
})

test("with-seq", (t) => {
    t.deepEqual(part101.withSeq(5), SimplePosPart.from(1, 0, 5))
})

test("asTuple", (t) => {
    const a = 1
    const b = 2
    const c = 3
    t.deepEqual(SimplePosPart.from(a, b, c).asTuple(), [a, b, c])
})

test("from-plain", (t) => {
    t.is(SimplePosPart.fromPlain(undefined), undefined)
    t.deepEqual(SimplePosPart.fromPlain(part101), part101)
})