import test from "ava"

import { BlockOrdering, Block } from "../../../src/core/block"
import { SimpleBlockFactory } from "../../../src/pos/simple/simple-block-factory"
import { U32_BOTTOM } from "../../../src/core/number"
import { SimplePosPart } from "../../../src/pos/simple/simple-pos-part"
import { SimplePos } from "../../../src/pos/simple/simple-pos"

const seed = "dotted-logootsplit"

const factoryA = SimpleBlockFactory.from(1, seed)
const firstA = factoryA.from("ab")
const factoryB = SimpleBlockFactory.from(2, seed)
const firstB = factoryB.after(firstA, "rs")

test("after_appendable-block", (t) => {
    const copiedFactoryA = factoryA.copy()
    const appendable = copiedFactoryA.after(firstA, "de")
    const noappendable = copiedFactoryA.between(firstA, "c", appendable)

    t.is(appendable.compare(firstA), BlockOrdering.APPENDABLE)

    t.is(noappendable.compare(firstA), BlockOrdering.AFTER)
    t.is(noappendable.compare(appendable), BlockOrdering.BEFORE)
})

test("before_prependable-block", (t) => {
    const copiedFactoryA = factoryA.copy()
    const prependable = copiedFactoryA.before("12", firstA)
    const noappendable = copiedFactoryA.between(prependable, "3", firstA)

    t.is(prependable.compare(firstA), BlockOrdering.PREPENDABLE)

    t.is(noappendable.compare(prependable), BlockOrdering.AFTER)
    t.is(noappendable.compare(firstA), BlockOrdering.BEFORE)
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
    const factoryC = SimpleBlockFactory.from(3, seed)
    const surrounded = factoryC.between(firstA, "xy", firstB)

    t.is(surrounded.compare(firstA), BlockOrdering.AFTER)
    t.is(surrounded.compare(firstB), BlockOrdering.BEFORE)
})

test("between_dense-set-appendable", (t) => {
    const fA = SimpleBlockFactory.from(1, seed)
    const ab = fA.from("ab")
    const B = 2
    const priority = ab.lowerPos.parts[0].priority
    const part2 = SimplePosPart.from(priority + 1, B, 0, 0)
    const block2 = new Block(SimplePos.from([part2]), "x")

    const surrounded = factoryB.copy().between(ab, "1", block2)
    const appendable = fA.copy().between(ab, "c", surrounded)

    t.is(appendable.compare(ab), BlockOrdering.APPENDABLE)
    t.is(appendable.compare(surrounded), BlockOrdering.BEFORE)
    t.is(surrounded.compare(block2), BlockOrdering.BEFORE)
})

test("between_variable-sized-position", (t) => {
    const [A, B] = [1, 2]
    const partA1 = SimplePosPart.from(5, A, 0, 0)
    const blockA = new Block(SimplePos.from([partA1]), "a")
    const partB1 = SimplePosPart.from(6, B, 0, 0)
    const partB2 = SimplePosPart.from(U32_BOTTOM + 1, B, 1, 0)
    const blockB = new Block(SimplePos.from([partB1, partB2]), "2")
    const partA2 = SimplePosPart.from(7, A, 0, 1)
    const blockA2 = new Block(SimplePos.from([partA2]), "c")

    const surroundedB = factoryB.copy().between(blockA, "1", blockB)

    t.is(blockA.compare(surroundedB), BlockOrdering.BEFORE)
    t.is(surroundedB.compare(blockB), BlockOrdering.BEFORE)

    const surroundedA = factoryA.copy().between(blockB, "b", blockA2)

    t.is(blockB.compare(surroundedA), BlockOrdering.BEFORE)
    t.is(surroundedA.compare(blockA2), BlockOrdering.BEFORE)
})

test("garbage-collect", (t) => {
    const copiedFactoryA = factoryA.copy()
    copiedFactoryA.garbageCollect(firstA.toLengthBlock())
    const newBlock = copiedFactoryA.from("cd")

    t.not(firstA.lowerPos.nth(), newBlock.lowerPos.nth())
})

test("from-plain", (t) => {
    t.is(SimpleBlockFactory.fromPlain(undefined), undefined)
    t.is(SimpleBlockFactory.fromPlain(null), undefined)
    t.is(SimpleBlockFactory.fromPlain({}), undefined)
    t.is(SimpleBlockFactory.fromPlain([]), undefined)

    const plainFactoryA = JSON.parse(JSON.stringify(factoryA))
    t.deepEqual(
        SimpleBlockFactory.fromPlain(plainFactoryA),
        factoryA as SimpleBlockFactory
    )
})
