
import { Concat } from "../../src/core/concat"
import { Block } from "../../src/core/block"
import { SimplePos } from "../../src/position/simplepos"
import { SimplePosPart } from "../../src/position/simplepospart"

export function twinPositionPart (ref: SimplePosPart): SimplePosPart {
    return SimplePosPart.from(ref.priority, ref.replica, ref.seq)
}

export function twinPosition (ref: SimplePos): SimplePos {
    return SimplePos.from(ref.parts.map(twinPositionPart))
}

export function twinBlock <E extends Concat<E>>
    (ref: Block<SimplePos, E>): Block<SimplePos, E> {

    return new Block(twinPosition(ref.lowerPosition), ref.items)
}
