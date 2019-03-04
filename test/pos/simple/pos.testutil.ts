import { Concat } from "../../../src/core/concat"
import { Block } from "../../../src/core/block"
import { SimplePos } from "../../../src/pos/simple/simple-pos"
import { SimplePosPart } from "../../../src/pos/simple/simple-pos-part"

export function twinPositionPart(ref: SimplePosPart): SimplePosPart {
    return SimplePosPart.from(ref.priority, ref.replica, ref.nth, ref.offset)
}

export function twinPosition(ref: SimplePos): SimplePos {
    return SimplePos.from(ref.parts.map(twinPositionPart))
}

export function twinBlock<E extends Concat<E>>(
    ref: Block<SimplePos, E>
): Block<SimplePos, E> {
    return new Block(twinPosition(ref.lowerPos), ref.content)
}
