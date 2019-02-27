import test from "ava"

import { twinBlock } from "../dot-pos/simple/pos.testutil"

import { Block, BlockOrdering } from "../../src/core/block"
import { SimpleDotPos } from "../../src/dot-pos/simple/simple-dot-pos"
import { SimpleDotPosPart } from "../../src/dot-pos/simple/simple-dot-pos-part"

const part0 = SimpleDotPosPart.from(1, 0, 0)
const part3 = SimpleDotPosPart.from(1, 0, 3)
const prefixingPart1 = SimpleDotPosPart.from(1, 1, 1)

const pos1 = SimpleDotPos.from([prefixingPart1, part0])
const pos10 = SimpleDotPos.from([prefixingPart1, part0, part3])

const b1abc = new Block(pos1, "abc")
const b1ab = new Block(pos1, "ab")
const b1bc = new Block(pos1.intSucc(1), "bc")
const b1a = new Block(pos1, "a")
const b1b = new Block(pos1.intSucc(1), "b")
const b1c = new Block(pos1.intSucc(2), "c")
const b10xyz = new Block(pos10, "xyz")

test("length", (t) => {
    t.is(b1abc.length, b1abc.items.length)
})

test("nthPosition", (t) => {
    for (let i = 0; i < b1abc.length; i++) {
        t.deepEqual(b1abc.nthPos(i), b1abc.lowerPos.intSucc(i))
    }
})

test("upperPosition", (t) => {
    t.deepEqual(b1abc.upperPos(), b1abc.nthPos(b1abc.length - 1))
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

    t.is(b1abc.compare(b1a), BlockOrdering.INCLUDING_LEFT)
    t.is(b1a.compare(b1abc), BlockOrdering.INCLUDED_LEFT_BY)

    t.is(b1abc.compare(b1c), BlockOrdering.INCLUDING_RIGHT)
    t.is(b1c.compare(b1abc), BlockOrdering.INCLUDED_RIGHT_BY)

    t.is(b1abc.compare(b1b), BlockOrdering.INCLUDING_MIDDLE)
    t.is(b1b.compare(b1abc), BlockOrdering.INCLUDED_MIDDLE_BY)
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

test("has-prependable", (t) => {
    t.true(b1ab.hasPrependable(b1bc))
    t.true(b1ab.hasPrependable(b1b))
    t.true(b1abc.hasPrependable(b1b))

    t.false(b1bc.hasPrependable(b1b))
    t.false(b1b.hasPrependable(b1c))
})

test("prependable", (t) => {
    t.deepEqual(b1ab.prependable(b1b), b1a)
    t.deepEqual(b1abc.prependable(b1b), b1a)
})

test("has-appendable", (t) => {
    t.true(b1bc.hasAppendable(b1ab))
    t.true(b1bc.hasAppendable(b1b))
    t.true(b1abc.hasAppendable(b1b))

    t.false(b1a.hasAppendable(b1c))
    t.false(b1bc.hasAppendable(b1c))
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
