import test from "ava"

import { U32_TOP } from "../../src/util/number.js"
import { BaseOrdering } from "../../src/index.js"
import { Ordering } from "../../src/util/ordering.js"
import { posOf, twinPosition } from "./pos.testutil.js"

const A = 0
const pos1_ = posOf(1, A, 1)
const pos13 = posOf(1, A, 1, 1, A, 3)
const pos14 = posOf(1, A, 1, 1, A, 4)
const pos2_ = posOf(1, A, 2)
const pos25 = posOf(1, A, 2, 1, A, 5)
const pos26 = posOf(1, A, 2, 1, A, 6)

test("hasIntSucc", (t) => {
    t.true(pos1_.hasIntSucc(1))
    t.true(pos1_.hasIntSucc(U32_TOP - 1))
    t.false(pos1_.hasIntSucc(U32_TOP))
})

test("intSucc", (t) => {
    t.deepEqual(pos1_.intSucc(1), pos2_)
})

test("intDistance", (t) => {
    t.deepEqual(pos1_.intDistance(twinPosition(pos1_)), [0, Ordering.EQUAL])
    t.deepEqual(pos1_.intDistance(pos13), [0, Ordering.EQUAL])
    t.deepEqual(pos13.intDistance(pos1_), [0, Ordering.EQUAL])

    t.deepEqual(pos1_.intDistance(pos2_), [1, Ordering.BEFORE])
    t.deepEqual(pos2_.intDistance(pos1_), [1, Ordering.AFTER])

    t.deepEqual(pos1_.intDistance(pos25), [1, Ordering.BEFORE])
    t.deepEqual(pos25.intDistance(pos1_), [1, Ordering.AFTER])
})

test("compareBase", (t) => {
    t.is(pos1_.compareBase(twinPosition(pos1_)), BaseOrdering.EQUAL)
    t.is(pos2_.compareBase(twinPosition(pos2_)), BaseOrdering.EQUAL)
    t.is(pos13.compareBase(twinPosition(pos13)), BaseOrdering.EQUAL)
    t.is(pos25.compareBase(twinPosition(pos25)), BaseOrdering.EQUAL)
    t.is(pos26.compareBase(twinPosition(pos26)), BaseOrdering.EQUAL)

    t.is(pos1_.compareBase(pos2_), BaseOrdering.EQUAL)
    t.is(pos13.compareBase(pos14), BaseOrdering.EQUAL)
    t.is(pos25.compareBase(pos26), BaseOrdering.EQUAL)

    t.is(pos1_.compareBase(pos13), BaseOrdering.PREFIXING)
    t.is(pos1_.compareBase(pos14), BaseOrdering.PREFIXING)
    t.is(pos13.compareBase(pos1_), BaseOrdering.PREFIXED_BY)
    t.is(pos14.compareBase(pos1_), BaseOrdering.PREFIXED_BY)

    t.is(pos2_.compareBase(pos26), BaseOrdering.PREFIXING)
    t.is(pos2_.compareBase(pos25), BaseOrdering.PREFIXING)
    t.is(pos26.compareBase(pos2_), BaseOrdering.PREFIXED_BY)
    t.is(pos25.compareBase(pos2_), BaseOrdering.PREFIXED_BY)

    t.is(pos13.compareBase(pos25), BaseOrdering.BEFORE)
    t.is(pos13.compareBase(pos26), BaseOrdering.BEFORE)
    t.is(pos25.compareBase(pos13), BaseOrdering.AFTER)
    t.is(pos26.compareBase(pos13), BaseOrdering.AFTER)
})

test("compare", (t) => {
    t.is(pos1_.compare(twinPosition(pos1_)), Ordering.EQUAL)
    t.is(pos2_.compare(twinPosition(pos2_)), Ordering.EQUAL)
    t.is(pos13.compare(twinPosition(pos13)), Ordering.EQUAL)
    t.is(pos25.compare(twinPosition(pos25)), Ordering.EQUAL)
    t.is(pos26.compare(twinPosition(pos26)), Ordering.EQUAL)

    t.is(pos1_.compare(pos2_), Ordering.BEFORE)
    t.is(pos2_.compare(pos1_), Ordering.AFTER)

    t.is(pos1_.compare(pos13), Ordering.BEFORE)
    t.is(pos13.compare(pos1_), Ordering.AFTER)

    t.is(pos13.compare(pos2_), Ordering.BEFORE)
    t.is(pos2_.compare(pos13), Ordering.AFTER)

    t.is(pos2_.compare(pos25), Ordering.BEFORE)
    t.is(pos25.compare(pos2_), Ordering.AFTER)

    t.is(pos25.compare(pos26), Ordering.BEFORE)
    t.is(pos26.compare(pos25), Ordering.AFTER)
})
