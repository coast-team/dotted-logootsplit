import test from "ava"

import { twinBlock } from "../position/position.testutil"

import { Block, BlockOrdering } from "../../src/core/block"
import { SimplePosition } from "../../src/position/simpleposition"
import { SimplePositionPart } from "../../src/position/simplepositionpart"

const part0 = SimplePositionPart.from(1, 0, 0)
const part3 = SimplePositionPart.from(1, 0, 3)
const prefixingPart1 = SimplePositionPart.from(1, 1, 1)

const pos1 = SimplePosition.from([prefixingPart1, part0])
const pos10 = SimplePosition.from([prefixingPart1, part0, part3])

const b1abc = new Block(pos1, "abc")
const b1ab = new Block(pos1, "ab")
const b1bc = new Block(pos1.intSuccessor(1), "bc")
const b1a = new Block(pos1, "a")
const b1b = new Block(pos1.intSuccessor(1), "b")
const b1c = new Block(pos1.intSuccessor(2), "c")
const b10xyz = new Block(pos10, "xyz")

test("length", (t) => {
    t.is(b1abc.length, b1abc.items.length)
})

test("nthPosition", (t) => {
    for (let i = 0; i < b1abc.length; i++) {
        t.deepEqual(b1abc.nthPosition(i), b1abc.lowerPosition.intSuccessor(i))
    }
})

test("upperPosition", (t) => {
    t.deepEqual(b1abc.upperPosition, b1abc.nthPosition(b1abc.length - 1))
})

test("compare", (t) => {
    t.is(b1a.compare(twinBlock(b1a)), BlockOrdering.EQUAL)

    t.is(b10xyz.compare(b1a), BlockOrdering.AFTER)
    t.is(b1a.compare(b10xyz), BlockOrdering.BEFORE)

    t.is(b10xyz.compare(b1b), BlockOrdering.BEFORE)
    t.is(b1b.compare(b10xyz), BlockOrdering.AFTER)

    t.is(b1a.compare(b1bc), BlockOrdering.PREPENDABLE)
    t.is(b1bc.compare(b1a), BlockOrdering.APPENDABLE)

    t.is(b1a.compare(b1c), BlockOrdering.BEFORE)
    t.is(b1c.compare(b1a), BlockOrdering.AFTER)

    t.is(b1abc.compare(b10xyz), BlockOrdering.SPLITTED_BY)
    t.is(b10xyz.compare(b1abc), BlockOrdering.SPLITTING)

    t.is(b1ab.compare(b1bc), BlockOrdering.OVERLAPPING_BEFORE)
    t.is(b1bc.compare(b1ab), BlockOrdering.OVERLAPPING_AFTER)

    t.is(b1abc.compare(b1a), BlockOrdering.INCLUDING)
    t.is(b1a.compare(b1abc), BlockOrdering.INCLUDED_BY)
})

test("append", (t) => {
    t.deepEqual(b1a.append(b1bc), b1abc)
})

test("spliAt", (t) => {
    t.deepEqual(b1abc.splitAt(1), [b1a, b1bc])
})

test("splittingIndex", (t) => {
    t.is(b1abc.splittingIndex(b10xyz), 1)
})

test("splitWith", (t) => {
    t.deepEqual(b1abc.splitWith(b10xyz), [b1a, b1bc])
})

test("prependable", (t) => {
    t.deepEqual(b1ab.prependable(b1b), b1a)
    t.deepEqual(b1abc.prependable(b1b), b1a)
})

test("appendable", (t) => {
    t.deepEqual(b1bc.appendable(b1b), b1c)
    t.deepEqual(b1abc.appendable(b1b), b1c)
})

test("intersection", (t) => {
    for (const b of [b1a, b1b, b1c]) {
        t.deepEqual(b1abc.intersection(b), b)
        t.deepEqual(b.intersection(b1abc), b)
    }
})

test("remove", (t) => {
    t.deepEqual(b1abc.remove(b1a), [undefined, b1bc])
    t.deepEqual(b1abc.remove(b1b), [b1a, b1c])
    t.deepEqual(b1abc.remove(b1c), [b1ab, undefined])

    t.deepEqual(b1a.remove(b1abc), [undefined, undefined])
    t.deepEqual(b1b.remove(b1abc), [undefined, undefined])
    t.deepEqual(b1c.remove(b1abc), [undefined, undefined])
})
