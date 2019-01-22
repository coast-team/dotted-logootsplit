import test from "ava"

import { BlockOrdering, Block } from "../../../src/core/block"
import { SimpleBlockFactory } from "../../../src/pos/simple/simple-block-factory"
import { SimplePos, SimplePosPart } from "../../../src"
import { U32_BOTTOM } from "../../../src/core/number"

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
    const priority = firstA.lowerPos.parts[0].priority
    const part2 = SimplePosPart.from(priority + 1, B, 0)
    const block2 = new Block(SimplePos.from([part2]), "x")

    const [surrounded, ] = factoryB.between(firstA, "1", block2)
    const [appendable, ] = factoryA.between(firstA, "c", surrounded)

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)
    t.is(appendable.compare(surrounded), BlockOrdering.BEFORE)
    t.is(surrounded.compare(block2), BlockOrdering.BEFORE)
})

test("between_variable-sized-position", (t) => {
    const [A, B] = [1, 2]
    const partA1 = SimplePosPart.from(5, A, 0)
    const blockA = new Block(SimplePos.from([partA1]), "a")
    const partB1 = SimplePosPart.from(6, B, 0)
    const partB2 = SimplePosPart.from(U32_BOTTOM + 1, B, 1)
    const blockB = new Block(SimplePos.from([partB1, partB2]), "2")
    const partA2 = SimplePosPart.from(7, A, 1)
    const blockA2 = new Block(SimplePos.from([partA2]), "c")

    const [surroundedB, ] = factoryB.between(blockA, "1", blockB)

    t.is(blockA.compare(surroundedB), BlockOrdering.BEFORE)
    t.is(surroundedB.compare(blockB), BlockOrdering.BEFORE)

    const [surroundedA, ] = factoryA.between(blockB, "b", blockA2)

    t.is(blockB.compare(surroundedA), BlockOrdering.BEFORE)
    t.is(surroundedA.compare(blockA2), BlockOrdering.BEFORE)
})

test("from-plain", (t) => {
    t.is(SimpleBlockFactory.fromPlain(undefined), undefined)
    t.is(SimpleBlockFactory.fromPlain(null), undefined)
    t.is(SimpleBlockFactory.fromPlain({}), undefined)
    t.is(SimpleBlockFactory.fromPlain([]), undefined)

    t.deepEqual(
        SimpleBlockFactory.fromPlain(factoryA),
        factoryA as SimpleBlockFactory
    )
})
