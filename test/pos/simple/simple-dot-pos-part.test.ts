import test from "ava"

import { twinPositionPart } from "./pos.testutil"

import { Ordering } from "../../../src/util/ordering"
import { SimplePosPart } from "../../../src/pos/simple/simple-pos-part"

const part1001 = SimplePosPart.from(1, 0, 0, 1)
const part1110 = SimplePosPart.from(1, 0, 1, 0)
const part1100 = SimplePosPart.from(1, 1, 0, 0)
const part2000 = SimplePosPart.from(2, 0, 0, 0)

test("asTuple", (t) => {
    const a = 1
    const b = 2
    const c = 3
    const d = 4
    t.deepEqual(SimplePosPart.from(a, b, c, d).asTuple(), [a, b, c, 4])
})

test("with-offset", (t) => {
    t.deepEqual(part1001.withOffset(5), SimplePosPart.from(1, 0, 0, 5))
})

test("compare", (t) => {
    // reflexivity
    t.is(part1001.compare(twinPositionPart(part1001)), Ordering.EQUAL)
    t.is(part1110.compare(twinPositionPart(part1110)), Ordering.EQUAL)
    t.is(part1100.compare(twinPositionPart(part1100)), Ordering.EQUAL)
    t.is(part2000.compare(twinPositionPart(part2000)), Ordering.EQUAL)

    t.is(part1001.compare(part1001.withOffset(5)), Ordering.BEFORE)
    t.is(part1100.compare(part1100.withOffset(5)), Ordering.BEFORE)

    t.is(part1001.compare(part1110), Ordering.BEFORE)
    t.is(part1110.compare(part1100), Ordering.BEFORE)
    t.is(part1100.compare(part2000), Ordering.BEFORE)

    t.is(part1110.compare(part1001), Ordering.AFTER)
    t.is(part1100.compare(part1110), Ordering.AFTER)
    t.is(part2000.compare(part1100), Ordering.AFTER)
})

test("compareBase", (t) => {
    // reflexivity
    t.is(part1001.compareBase(twinPositionPart(part1001)), Ordering.EQUAL)
    t.is(part1100.compareBase(twinPositionPart(part1100)), Ordering.EQUAL)
    t.is(part2000.compareBase(twinPositionPart(part2000)), Ordering.EQUAL)

    t.is(part1001.compareBase(part1001.withOffset(5)), Ordering.EQUAL)
    t.is(part1100.compareBase(part1100.withOffset(5)), Ordering.EQUAL)

    t.is(part1001.compareBase(part1110), Ordering.BEFORE)
    t.is(part1110.compareBase(part1100), Ordering.BEFORE)
    t.is(part1100.compareBase(part2000), Ordering.BEFORE)

    t.is(part1110.compareBase(part1001), Ordering.AFTER)
    t.is(part1100.compareBase(part1110), Ordering.AFTER)
    t.is(part2000.compareBase(part1100), Ordering.AFTER)
})

test("from-plain", (t) => {
    t.is(SimplePosPart.fromPlain(undefined), undefined)
    t.deepEqual(SimplePosPart.fromPlain(part1001), part1001)
})
