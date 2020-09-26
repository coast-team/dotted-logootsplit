import test from "ava"
import { Anchor, Ordering } from "../../src"
import { posOf } from "./pos.testutil"

const pos1 = posOf(1, 0, 1)
const pos13 = posOf(1, 0, 1, 1, 0, 3)
const pos2 = posOf(1, 0, 2)

const anchor1after = new Anchor(pos1, true)
const anchor13before = new Anchor(pos13, false)
const anchor13after = new Anchor(pos13, true)
const anchor2before = new Anchor(pos2, false)

test("compare", (t) => {
    t.is(anchor1after.compare(anchor13before), Ordering.BEFORE)
    t.is(anchor13before.compare(anchor13after), Ordering.BEFORE)
    t.is(anchor13after.compare(anchor2before), Ordering.BEFORE)
})

test("compare-with", (t) => {
    t.is(anchor1after.compareWith(pos13), Ordering.BEFORE)
    t.is(anchor13before.compareWith(pos13), Ordering.BEFORE)
    t.is(anchor13after.compareWith(pos13), Ordering.AFTER)
    t.is(anchor2before.compareWith(pos13), Ordering.AFTER)
})

test("from-plain", (t) => {
    t.is(Anchor.fromPlain(undefined), undefined)
    t.is(Anchor.fromPlain(null), undefined)
    t.is(Anchor.fromPlain({}), undefined)
    t.is(Anchor.fromPlain([]), undefined)

    const plain = JSON.parse(JSON.stringify(anchor13before))
    t.deepEqual(Anchor.fromPlain(plain), anchor13before)
})
