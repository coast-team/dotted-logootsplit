
import test from "ava"

import {
    ReplicableLinkedList,
    SimpleBlockFactory
} from "../src/"

const seed = "dotted-logootsplit"

test("readme-example", (t) => {
    const replicaA = 0
    const strategyA = SimpleBlockFactory.from(replicaA, seed)
    const stateA = new ReplicableLinkedList(strategyA, "")

    const replicaB = 1
    const strategyB = SimpleBlockFactory.from(replicaB, seed)
    const stateB = new ReplicableLinkedList(strategyB, "")

    const deltaA1 = stateA.insertAt(0, "Helo  ")
    const deltaA2 = stateA.insertAt(6, "world!")

    stateB.applyDelta(deltaA1)
    const deltaB1 = stateB.insertAt(2, "l")
    stateB.applyDelta(deltaA2)
    const deltasB2 = stateB.removeAt(5, 1) // remove a space

    stateA.applyDelta(deltaB1)
    for (const d of deltasB2) {
        stateA.applyDelta(d)
    }

    t.is(stateA.concatenated(""), stateB.concatenated(""))
    t.is(stateA.concatenated(""), "Hello world!")
})
