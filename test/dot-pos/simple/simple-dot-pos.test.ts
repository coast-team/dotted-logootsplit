import test from "ava"

import { twinPosition } from "./pos.testutil"

import { U32_TOP } from "../../../src/core/number"
import { BaseOrdering } from "../../../src/core/pos"
import { Ordering } from "../../../src/core/ordering"
import { SimpleDotPosPart } from "../../../src/dot-pos/simple/simple-dot-pos-part"
import { SimpleDotPos } from "../../../src/dot-pos/simple/simple-dot-pos"

const part0 = SimpleDotPosPart.from(1, 0, 0)
const part1 = SimpleDotPosPart.from(1, 0, 1)
const part2 = SimpleDotPosPart.from(1, 0, 2)
const part3 = SimpleDotPosPart.from(1, 0, 3)
const part4 = SimpleDotPosPart.from(1, 0, 4)
const part5 = SimpleDotPosPart.from(1, 0, 5)

const pos0 = SimpleDotPos.from([part0])
const pos1 = SimpleDotPos.from([part1])
const pos02 = SimpleDotPos.from([part0, part2])
const pos03 = SimpleDotPos.from([part0, part3])
const pos14 = SimpleDotPos.from([part1, part4])
const pos15 = SimpleDotPos.from([part1, part5])

test("hasIntSucc", (t) => {
    t.true(pos0.hasIntSucc(1))
    t.true(pos0.hasIntSucc(U32_TOP))
    t.false(pos1.hasIntSucc(U32_TOP))
})

test("intSucc", (t) => {
    t.deepEqual(pos0.intSucc(1), pos1)
})

test("intDistance", (t) => {
    t.deepEqual(pos0.intDistance(twinPosition(pos0)), [0, Ordering.EQUAL])
    t.deepEqual(pos0.intDistance(pos02), [0, Ordering.EQUAL])
    t.deepEqual(pos02.intDistance(pos0), [0, Ordering.EQUAL])

    t.deepEqual(pos0.intDistance(pos1), [1, Ordering.BEFORE])
    t.deepEqual(pos1.intDistance(pos0), [1, Ordering.AFTER])

    t.deepEqual(pos0.intDistance(pos14), [1, Ordering.BEFORE])
    t.deepEqual(pos14.intDistance(pos0), [1, Ordering.AFTER])
})

test("compareBase", (t) => {
    t.is(pos0.compareBase(twinPosition(pos0)), BaseOrdering.EQUAL)
    t.is(pos1.compareBase(twinPosition(pos1)), BaseOrdering.EQUAL)
    t.is(pos02.compareBase(twinPosition(pos02)), BaseOrdering.EQUAL)
    t.is(pos14.compareBase(twinPosition(pos14)), BaseOrdering.EQUAL)
    t.is(pos15.compareBase(twinPosition(pos15)), BaseOrdering.EQUAL)

    t.is(pos0.compareBase(pos1), BaseOrdering.EQUAL)
    t.is(pos02.compareBase(pos03), BaseOrdering.EQUAL)
    t.is(pos14.compareBase(pos15), BaseOrdering.EQUAL)

    t.is(pos0.compareBase(pos02), BaseOrdering.PREFIXING)
    t.is(pos0.compareBase(pos03), BaseOrdering.PREFIXING)
    t.is(pos02.compareBase(pos0), BaseOrdering.PREFIXED_BY)
    t.is(pos03.compareBase(pos0), BaseOrdering.PREFIXED_BY)

    t.is(pos1.compareBase(pos15), BaseOrdering.PREFIXING)
    t.is(pos1.compareBase(pos14), BaseOrdering.PREFIXING)
    t.is(pos15.compareBase(pos1), BaseOrdering.PREFIXED_BY)
    t.is(pos14.compareBase(pos1), BaseOrdering.PREFIXED_BY)

    t.is(pos02.compareBase(pos14), BaseOrdering.BEFORE)
    t.is(pos02.compareBase(pos15), BaseOrdering.BEFORE)
    t.is(pos14.compareBase(pos02), BaseOrdering.AFTER)
    t.is(pos15.compareBase(pos02), BaseOrdering.AFTER)
})

test("compare", (t) => {
    t.is(pos0.compare(twinPosition(pos0)), Ordering.EQUAL)
    t.is(pos1.compare(twinPosition(pos1)), Ordering.EQUAL)
    t.is(pos02.compare(twinPosition(pos02)), Ordering.EQUAL)
    t.is(pos14.compare(twinPosition(pos14)), Ordering.EQUAL)
    t.is(pos15.compare(twinPosition(pos15)), Ordering.EQUAL)

    t.is(pos0.compare(pos1), Ordering.BEFORE)
    t.is(pos1.compare(pos0), Ordering.AFTER)

    t.is(pos0.compare(pos02), Ordering.BEFORE)
    t.is(pos02.compare(pos0), Ordering.AFTER)

    t.is(pos02.compare(pos1), Ordering.BEFORE)
    t.is(pos1.compare(pos02), Ordering.AFTER)

    t.is(pos1.compare(pos14), Ordering.BEFORE)
    t.is(pos14.compare(pos1), Ordering.AFTER)

    t.is(pos14.compare(pos15), Ordering.BEFORE)
    t.is(pos15.compare(pos14), Ordering.AFTER)
})

test("isBaseEqual", (t) => {
    t.true(pos0.isBaseEqual(pos0))

    t.true(pos0.isBaseEqual(pos1))
    t.true(pos1.isBaseEqual(pos0))
})

test("from-plain", (t) => {
    t.is(SimpleDotPos.fromPlain(undefined), undefined)
    t.deepEqual(SimpleDotPos.fromPlain(pos0), pos0)

    const malformedPos1 = { parts: [] }
    t.is(SimpleDotPos.fromPlain(malformedPos1), undefined)
    const malformedPos2 = {
        parts: [
            {
                priority: U32_TOP,
                replica: 1,
                seq: 0,
            },
        ],
    }
    t.is(SimpleDotPos.fromPlain(malformedPos2), undefined)
    const malformedPos3 = { parts: [undefined] }
    t.is(SimpleDotPos.fromPlain(malformedPos3), undefined)
})
