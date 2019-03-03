import test from "ava"

import { BlockOrdering, Block } from "../../../src/core/block"
import { SimpleDotBlockFactory } from "../../../src/"
import { SimpleDotPos } from "../../../src"
import { U32_BOTTOM } from "../../../src/core/number"
import { SimpleDotPosPart } from "../../../src/dot-pos/simple/simple-dot-pos-part"

const seed = "dotted-logootsplit"

const factoryA = SimpleDotBlockFactory.from(1, seed)
const firstA = factoryA.from("ab")
const factoryB = SimpleDotBlockFactory.from(2, seed)
const firstB = factoryB.after(firstA, "rs")

test("after_appendable-block", (t) => {
    const appendable = factoryA.copy().after(firstA, "cd")

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)
})

test("between_splitting-block", (t) => {
    const [lBlock, rBlock] = firstA.splitAt(1)
    const splitting = factoryA.copy().between(lBlock, "xy", rBlock)
    t.is(splitting.compare(firstA), BlockOrdering.SPLITTING)
})

test("before_other-replica", (t) => {
    const after = factoryB.copy().before("xy", firstA)
    t.is(after.compare(firstA), BlockOrdering.BEFORE)
})

test("after_other-replica", (t) => {
    const after = factoryB.copy().after(firstA, "xy")
    t.is(after.compare(firstA), BlockOrdering.AFTER)
})

test("between_surrounded-block", (t) => {
    const surrounded = factoryB.copy().between(firstA, "xy", firstB)

    t.is(surrounded.compare(firstA), BlockOrdering.AFTER)
    t.is(surrounded.compare(firstB), BlockOrdering.BEFORE)
})

test("between_dense-set-appendable", (t) => {
    const B = 2
    const priority = firstA.lowerPos.parts[0].priority
    const part2 = SimpleDotPosPart.from(priority + 1, B, 0)
    const block2 = new Block(SimpleDotPos.from([part2]), "x")

    const surrounded = factoryB.copy().between(firstA, "1", block2)
    const appendable = factoryA.copy().between(firstA, "c", surrounded)

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)
    t.is(appendable.compare(surrounded), BlockOrdering.BEFORE)
    t.is(surrounded.compare(block2), BlockOrdering.BEFORE)
})

test("between_variable-sized-position", (t) => {
    const [A, B] = [1, 2]
    const partA1 = SimpleDotPosPart.from(5, A, 0)
    const blockA = new Block(SimpleDotPos.from([partA1]), "a")
    const partB1 = SimpleDotPosPart.from(6, B, 0)
    const partB2 = SimpleDotPosPart.from(U32_BOTTOM + 1, B, 1)
    const blockB = new Block(SimpleDotPos.from([partB1, partB2]), "2")
    const partA2 = SimpleDotPosPart.from(7, A, 1)
    const blockA2 = new Block(SimpleDotPos.from([partA2]), "c")

    const surroundedB = factoryB.copy().between(blockA, "1", blockB)

    t.is(blockA.compare(surroundedB), BlockOrdering.BEFORE)
    t.is(surroundedB.compare(blockB), BlockOrdering.BEFORE)

    const surroundedA = factoryA.copy().between(blockB, "b", blockA2)

    t.is(blockB.compare(surroundedA), BlockOrdering.BEFORE)
    t.is(surroundedA.compare(blockA2), BlockOrdering.BEFORE)
})

test("from-plain", (t) => {
    t.is(SimpleDotBlockFactory.fromPlain(undefined), undefined)
    t.is(SimpleDotBlockFactory.fromPlain(null), undefined)
    t.is(SimpleDotBlockFactory.fromPlain({}), undefined)
    t.is(SimpleDotBlockFactory.fromPlain([]), undefined)

    t.deepEqual(
        SimpleDotBlockFactory.fromPlain(factoryA),
        factoryA as SimpleDotBlockFactory
    )
})
