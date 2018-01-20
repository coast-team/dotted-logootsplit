import test from "ava"

import { twinPosition } from "./position.testutil"

//import {INT32_TOP} from '../../src/core/number'
import { UINT32_TOP } from "../../src/core/number"
import { BaseOrdering } from "../../src/core/position"
import { Ordering } from "../../src/core/ordering"
import { SimplePositionPart } from "../../src/position/simplepositionpart"
import { SimplePosition } from "../../src/position/simpleposition"

const part0 = SimplePositionPart.from(1, 0, 0)
const part1 = SimplePositionPart.from(1, 0, 1)
const part2 = SimplePositionPart.from(1, 0, 2)
const part3 = SimplePositionPart.from(1, 0, 3)
const part4 = SimplePositionPart.from(1, 0, 4)
const part5 = SimplePositionPart.from(1, 0, 5)

const pos0 = SimplePosition.from([part0])
const pos1 = SimplePosition.from([part1])
const pos02 = SimplePosition.from([part0, part2])
const pos03 = SimplePosition.from([part0, part3])
const pos14 = SimplePosition.from([part1, part4])
const pos15 = SimplePosition.from([part1, part5])

test("hasIntSuccessor", (t) => {
    t.true(pos0.hasIntSuccessor(1))
    t.true(pos0.hasIntSuccessor(UINT32_TOP))
})

test("hasIntSuccessor_contract_", (t) => {
    t.throws(() => pos0.hasIntSuccessor(-1))
    t.throws(() => pos0.hasIntSuccessor(UINT32_TOP + 1))
})

test("intSuccessor", (t) => {
    t.deepEqual(pos0.intSuccessor(1), pos1)
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
