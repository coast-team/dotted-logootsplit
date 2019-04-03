import { SimpleDotPos } from "../../src/dot-pos/simple/simple-dot-pos"
import { SimpleDotPosPart } from "../../src/dot-pos/simple/simple-dot-pos-part"
import test from "ava"
import { Anchor, Ordering } from "../../src"

const part1 = SimpleDotPosPart.from(1, 0, 1)
const part2 = SimpleDotPosPart.from(1, 0, 2)
const part3 = SimpleDotPosPart.from(1, 0, 3)

const pos1 = SimpleDotPos.from([part1])
const pos13 = SimpleDotPos.from([part1, part3])
const pos2 = SimpleDotPos.from([part2])

const anchor1after = Anchor.from(pos1, true)
const anchor13before = Anchor.from(pos13, false)
const anchor13after = Anchor.from(pos13, true)
const anchor2before = Anchor.from(pos2, false)

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
    t.is(Anchor.fromPlain(SimpleDotPos.fromPlain)(undefined), undefined)
    t.is(Anchor.fromPlain(SimpleDotPos.fromPlain)(null), undefined)
    t.is(Anchor.fromPlain(SimpleDotPos.fromPlain)({}), undefined)
    t.is(Anchor.fromPlain(SimpleDotPos.fromPlain)([]), undefined)

    t.deepEqual(
        Anchor.fromPlain(SimpleDotPos.fromPlain)(anchor13before),
        anchor13before
    )
})
