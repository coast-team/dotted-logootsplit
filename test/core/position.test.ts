import test from "ava"

import { BaseOrdering, baseOrderingInversion } from "../../src/core/position"

const BASE_ORDERING_VALUES = [
    BaseOrdering.BEFORE,
    BaseOrdering.PREFIXING,
    BaseOrdering.EQUAL,
    BaseOrdering.PREFIXED_BY,
    BaseOrdering.AFTER
]

test("baseOrderingInversion", (t) => {
    const len = BASE_ORDERING_VALUES.length
    for (let i = 0; i < len; i++) {
        const evaluated = baseOrderingInversion[BASE_ORDERING_VALUES[i]]
        const expected = BASE_ORDERING_VALUES[len - 1 - i]
        t.is(evaluated, expected)
    }
})
