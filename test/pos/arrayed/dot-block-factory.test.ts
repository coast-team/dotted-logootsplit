import test from "ava"

import { BlockOrdering, Block } from "../../../src/core/block"
import { DotBlockFactory } from "../../../src/pos/arrayed/dot-block-factory"
import { U32_BOTTOM } from "../../../src/util/number"
import { posOf } from "./pos.testutil"

const seed = "dotted-logootsplit"

const factoryA = DotBlockFactory.from(1, seed)
const firstA = factoryA.from("ab")
const factoryB = DotBlockFactory.from(2, seed)
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

test("between_dense-set", (t) => {
    const B = 2
    const priority = firstA.lowerPos.base[0]
    const block2 = new Block(posOf(priority + 1, B, 1), "x")

    const surrounded = factoryB.copy().between(firstA, "1", block2)
    const appendable = factoryA.copy().between(firstA, "c", surrounded)

    t.is(appendable.compare(firstA), BlockOrdering.AFTER)
    t.is(appendable.compare(surrounded), BlockOrdering.BEFORE)
    t.is(surrounded.compare(block2), BlockOrdering.BEFORE)
})

test("between_variable-sized-position", (t) => {
    const [A, B] = [1, 2]
    const posA1 = posOf(5, A, 1)
    const blockA = new Block(posA1, "a")
    const posB1 = posOf(6, B, 1, U32_BOTTOM + 1, B, 1)
    const blockB = new Block(posB1, "2")
    const posA2 = posOf(7, A, 1)
    const blockA2 = new Block(posA2, "c")

    const surroundedB = factoryB.copy().between(blockA, "1", blockB)

    t.is(blockA.compare(surroundedB), BlockOrdering.BEFORE)
    t.is(surroundedB.compare(blockB), BlockOrdering.BEFORE)

    const surroundedA = factoryA.copy().between(blockB, "b", blockA2)

    t.is(blockB.compare(surroundedA), BlockOrdering.BEFORE)
    t.is(surroundedA.compare(blockA2), BlockOrdering.BEFORE)
})
