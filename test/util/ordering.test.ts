import test from "ava"

import {
    lexCompareOrdering,
    Ordering,
    orderingInversion,
} from "../../src/util/ordering.js"

const ORDERING_VALUES = [Ordering.BEFORE, Ordering.EQUAL, Ordering.AFTER]

test("lexCompareOrdering_neutral-element", (t) => {
    for (const o of ORDERING_VALUES) {
        t.is(lexCompareOrdering(Ordering.EQUAL, o), o)
    }
})

test("lexCompareOrdering_lex-priority", (t) => {
    for (const o of ORDERING_VALUES) {
        t.is(lexCompareOrdering(Ordering.BEFORE, o), Ordering.BEFORE)
        t.is(lexCompareOrdering(Ordering.AFTER, o), Ordering.AFTER)
    }
})

test("orderingInversion", (t) => {
    const len = ORDERING_VALUES.length
    for (let i = 0; i < len; i++) {
        const evaluated = orderingInversion[ORDERING_VALUES[i]]
        const expected = ORDERING_VALUES[len - 1 - i]
        t.is(evaluated, expected)
    }
})
