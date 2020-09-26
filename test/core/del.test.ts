import test from "ava"
import { isDel, Del } from "../../src"

test("is-del", (t) => {
    t.false(isDel(undefined))
    t.false(isDel({}))
    t.false(isDel({ type: Del.TYPE }))
    t.false(isDel({ type: Del.TYPE, index: 4 }))
    t.false(isDel({ type: Del.TYPE, length: 5 }))

    const del1 = Del.from(4, 5)
    t.true(isDel(del1))
    t.true(isDel(JSON.parse(JSON.stringify(del1))))
})
