import { Concat } from "../../../src/core/concat"
import { Block } from "../../../src/core/block"
import { ArrayedPos } from "../../../src/pos/arrayed/arrayed-pos"
import { u32 } from "../../../src/util/number"

export const posOf = (...xs: u32[]): ArrayedPos =>
    new ArrayedPos(Uint32Array.from(xs.slice(0, -1)), xs[xs.length - 1])

export function twinPosition(ref: ArrayedPos): ArrayedPos {
    return new ArrayedPos(ref.base.slice(), ref.offset)
}

export function twinBlock<E extends Concat<E>>(
    ref: Block<ArrayedPos, E>
): Block<ArrayedPos, E> {
    return new Block(twinPosition(ref.lowerPos), ref.content)
}
