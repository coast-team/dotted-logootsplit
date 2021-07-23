import test from "ava"

import { ConcatLength } from "../../src/index.js"

const length0 = new ConcatLength(0)
const length1 = new ConcatLength(1)
const length2 = new ConcatLength(2)

test("slice", (t) => {
    t.deepEqual(length2.slice(0, 0), length0)
    t.deepEqual(length2.slice(1, 1), length0)

    t.deepEqual(length1.slice(0, 1), length1)
    t.deepEqual(length2.slice(0, 1), length1)

    t.deepEqual(length2.slice(1, 2), length1)
    t.deepEqual(length2.slice(0, 2), length2)
})

test("concat", (t) => {
    t.deepEqual(length0.concat(length0), length0)
    t.deepEqual(length0.concat(length1), length1)
    t.deepEqual(length1.concat(length0), length1) // commutative
    t.deepEqual(length0.concat(length2), length2)
    t.deepEqual(length2.concat(length0), length2) // commutative

    t.deepEqual(length1.concat(length1), length2)
})

test("fromPlain", (t) => {
    t.is(ConcatLength.fromPlain(undefined), undefined)
    t.is(ConcatLength.fromPlain({}), undefined)
    t.deepEqual(ConcatLength.fromPlain(length0), length0)
})
