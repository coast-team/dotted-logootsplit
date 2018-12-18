import test from "ava"

import { BlockOrdering, Block } from "../../src/core/block"
import { SimpleBlockFactory } from "../../src/position/simpleblockfactory"
import { SimplePos, SimplePosPart } from "../../src"

const seed = "dotted-logootsplit"

const [firstA, factoryA] = SimpleBlockFactory.from(1, seed).from("ab")
const [firstB, factoryB] = SimpleBlockFactory.from(2, seed).after(firstA, "rs")

test("after_appendable-block", (t) => {
    const [appendable, _] = factoryA.after(firstA, "cd")

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)
})

test("between_splitting-block", (t) => {
    const [lBlock, rBlock] = firstA.splitAt(1)
    const [splitting, _] = factoryA.between(lBlock, "xy", rBlock)
    t.is(splitting.compare(firstA), BlockOrdering.SPLITTING)
})

test("before_other-replica", (t) => {
    const [after, _] = factoryB.before("xy", firstA)
    t.is(after.compare(firstA), BlockOrdering.BEFORE)
})

test("after_other-replica", (t) => {
    const [after, _] = factoryB.after(firstA, "xy")
    t.is(after.compare(firstA), BlockOrdering.AFTER)
})

test("between_surrounded-block", (t) => {
    const [surrounded, _] = factoryB.between(firstA, "xy", firstB)

    t.is(surrounded.compare(firstA), BlockOrdering.AFTER)
    t.is(surrounded.compare(firstB), BlockOrdering.BEFORE)
})

test("between_dense-set-appendable", (t) => {
    const B = 2
    const priority = firstA.lowerPosition.parts[0].priority
    const pos2 = SimplePosPart.from(priority + 1, B, 0)
    const block2 = new Block(SimplePos.from([pos2]), "x")

    const [surrounded, ] = factoryB.between(firstA, "1", block2)
    const [appendable, ] = factoryA.between(firstA, "c", surrounded)

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)
    t.is(appendable.compare(surrounded), BlockOrdering.BEFORE)
})
