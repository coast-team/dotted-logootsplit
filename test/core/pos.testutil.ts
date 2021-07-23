import type { Concat } from "../../src/core/concat.js"
import { Block } from "../../src/core/block.js"
import { Pos } from "../../src/core/pos.js"
import type { u32 } from "../../src/util/number.js"

export const posOf = (...xs: u32[]): Pos =>
    new Pos(Uint32Array.from(xs.slice(0, -1)), xs[xs.length - 1])

export function twinPosition(ref: Pos): Pos {
    return new Pos(ref.base.slice(), ref.seq)
}

export function twinBlock<E extends Concat<E>>(ref: Block<E>): Block<E> {
    return new Block(twinPosition(ref.lowerPos), ref.content)
}
