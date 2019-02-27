import { Concat } from "../../../src/core/concat"
import { Block } from "../../../src/core/block"
import { SimpleDotPos } from "../../../src/dot-pos/simple/simple-dot-pos"
import { SimpleDotPosPart } from "../../../src/dot-pos/simple/simple-dot-pos-part"

export function twinPositionPart(ref: SimpleDotPosPart): SimpleDotPosPart {
    return SimpleDotPosPart.from(ref.priority, ref.replica, ref.seq)
}

export function twinPosition(ref: SimpleDotPos): SimpleDotPos {
    return SimpleDotPos.from(ref.parts.map(twinPositionPart))
}

export function twinBlock<E extends Concat<E>>(
    ref: Block<SimpleDotPos, E>
): Block<SimpleDotPos, E> {
    return new Block(twinPosition(ref.lowerPos), ref.items)
}
