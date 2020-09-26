import test from "ava"
import { SimpleDotBlockFactory } from "../../../src"
import { ValuedNode } from "../../../src/list/avl/avl-list-node"

const DEFAULT_SEED = "dotted-logootsplit"

test("balanced-tree", (t) => {
    const factory = SimpleDotBlockFactory.from(1, DEFAULT_SEED)
    const ef = factory.from("ef")
    const cd = factory.before("cd", ef)
    const hi = factory.after(ef, "hi")

    let root = ValuedNode.leaf(cd)
    root = root.balance()
    t.is(root.rank, 1)
    t.is(root.balanceFactor(), 0)

    root.insert(ef, 0)
    root = root.balance()
    t.is(root.rank, 2)
    t.is(root.balanceFactor(), 1)

    root.insert(hi, 0)
    root = root.balance()
    t.is(root.rank, 2)
    t.is(root.balanceFactor(), 0)
})
