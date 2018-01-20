
import { Concatenable } from "../../src/core/concatenable"
import { Block } from "../../src/core/block"
import { SimplePosition } from "../../src/position/simpleposition"
import { SimplePositionPart } from "../../src/position/simplepositionpart"

export function twinPositionPart (ref: SimplePositionPart): SimplePositionPart {
    return SimplePositionPart.from(ref.priority, ref.replica, ref.seq)
}

export function twinPosition (ref: SimplePosition): SimplePosition {
    return SimplePosition.from(ref.parts.map(twinPositionPart))
}

export function twinBlock <E extends Concatenable<E>>
    (ref: Block<SimplePosition, E>): Block<SimplePosition, E> {

    return new Block(twinPosition(ref.lowerPosition), ref.items)
}
