import test from "ava"
import { Ins, isIns } from "../../src/index.js"
import { isU32 } from "../../src/util/number.js"

test("is-ins", (t) => {
    t.false(isIns(isU32)(undefined))
    t.false(isIns(isU32)({}))
    t.false(isIns(isU32)({ type: Ins.TYPE }))
    t.false(isIns(isU32)({ type: Ins.TYPE, index: 4 }))
    t.false(isIns(isU32)({ type: Ins.TYPE, content: 10 }))

    const ins1 = Ins.from(4, 10)
    t.true(isIns(isU32)(ins1))
    t.true(isIns(isU32)(JSON.parse(JSON.stringify(ins1))))
})
