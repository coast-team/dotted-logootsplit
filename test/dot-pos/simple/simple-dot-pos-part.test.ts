import test from "ava"

import { twinPositionPart } from "./pos.testutil"

import { Ordering } from "../../../src/util/ordering"
import { SimpleDotPosPart } from "../../../src/dot-pos/simple/simple-dot-pos-part"

const part101 = SimpleDotPosPart.from(1, 0, 1)
const part111 = SimpleDotPosPart.from(1, 1, 1)
const part201 = SimpleDotPosPart.from(2, 0, 1)

test("asTuple", (t) => {
    const a = 1
    const b = 2
    const c = 3
    t.deepEqual(SimpleDotPosPart.from(a, b, c).asTuple(), [a, b, c])
})

test("with-seq", (t) => {
    t.deepEqual(part101.withSeq(5), SimpleDotPosPart.from(1, 0, 5))
})

test("compare", (t) => {
    // reflexivity
    t.is(part101.compare(twinPositionPart(part101)), Ordering.EQUAL)
    t.is(part111.compare(twinPositionPart(part111)), Ordering.EQUAL)
    t.is(part201.compare(twinPositionPart(part201)), Ordering.EQUAL)

    t.is(part101.compare(part101.withSeq(5)), Ordering.BEFORE)
    t.is(part111.compare(part111.withSeq(5)), Ordering.BEFORE)

    t.is(part101.compare(part111), Ordering.BEFORE)
    t.is(part111.compare(part201), Ordering.BEFORE)

    t.is(part111.compare(part101), Ordering.AFTER)
    t.is(part201.compare(part111), Ordering.AFTER)
})

test("compareBase", (t) => {
    // reflexivity
    t.is(part101.compareBase(twinPositionPart(part101)), Ordering.EQUAL)
    t.is(part111.compareBase(twinPositionPart(part111)), Ordering.EQUAL)
    t.is(part201.compareBase(twinPositionPart(part201)), Ordering.EQUAL)

    t.is(part101.compareBase(part101.withSeq(5)), Ordering.EQUAL)
    t.is(part111.compareBase(part111.withSeq(5)), Ordering.EQUAL)

    t.is(part101.compareBase(part111), Ordering.BEFORE)
    t.is(part111.compareBase(part201), Ordering.BEFORE)

    t.is(part111.compareBase(part101), Ordering.AFTER)
    t.is(part201.compareBase(part111), Ordering.AFTER)
})

test("from-plain", (t) => {
    t.is(SimpleDotPosPart.fromPlain(undefined), undefined)
    t.deepEqual(SimpleDotPosPart.fromPlain(part101), part101)
})
