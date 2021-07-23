import { MutList } from "cow-list"
import { Ordering } from "../util/ordering"
import type { FromPlain } from "replayable-random/dist/types/util/data-validation"
import { assert } from "../util/assert.js"
import { fromArray, isObject } from "../util/data-validation.js"
import { hashCodeOf, isU32, u32 } from "../util/number.js"
import { Anchor } from "./anchor.js"
import { BaseBlockk, Block, BlockOrdering } from "./block.js"
import type { Concat } from "./concat.js"
import type { Pos } from "./pos.js"

export const posFinder = <E extends Concat<E>>(pos: Pos) => (
    b: BaseBlockk
): Ordering => {
    if (pos.compare(b.lowerPos) === Ordering.AFTER) {
        return Ordering.AFTER
    } else {
        return Ordering.BEFORE
    }
}

export const summaryFinder = (sIndex: u32) => (
    v: BaseBlockk,
    summary: u32
): Ordering => {
    if (sIndex <= summary) {
        return Ordering.BEFORE
    } else if (sIndex >= summary + v.length) {
        return Ordering.AFTER
    }
    return Ordering.EQUAL
}

export const from = <E extends Concat<E>>(
    blocks: readonly Block<E>[]
): OpList<E> => {
    return new OpList(MutList.from(blocks))
}

export const fromPlain = <E extends Concat<E>>(
    itemFromPlain: FromPlain<E>
): FromPlain<OpList<E>> => {
    return (x) => {
        if (isObject<{ blocks: unknown[] }>(x) && Array.isArray(x)) {
            const blocks = fromArray(x, Block.fromPlain(itemFromPlain))
            if (blocks !== undefined) {
                return from(blocks)
            }
        }
        return undefined
    }
}

/**
 * Readonly list.
 */
export class OpList<E extends Concat<E>> {
    protected readonly blocks: MutList<Block<E>>

    constructor(blocks: MutList<Block<E>>) {
        this.blocks = blocks
    }

    // Access
    /**
     * Number of inserted items.
     */
    get length(): u32 {
        return this.blocks.summary
    }

    /**
     * @param f reducer that respectively accepts the accumulated value and
     *  the current block as first and second parameters. It returns the next
     *  accumulated value.
     * @param prefix initial value
     * @return accumulated value by reducing blocks from left to right
     *  in the list.
     */
    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        return this.blocks.reduce(f, prefix)
    }

    /**
     * @param prefix
     * @return Concatenated version prefixed by `prefix`.
     */
    concatenated(prefix: E): E {
        return this.reduceBlock((acc, b) => acc.concat(b.content), prefix)
    }

    /**
     * Non-cryptographic way to approximate object identity.
     * Do not take the blocks' content into account.
     */
    structuralHashCode(): u32 {
        return this.reduceBlock(
            (acc, b) => hashCodeOf([acc, b.structuralHashCode()]),
            0
        )
    }

    /**
     * @param index index where the anchor is
     * @param isAfter Is the anchor after `index`?
     * @return anchor at `index`.
     *  The anchor is sticked to the left position if isAfter is false.
     * Otherwise, it is sticked to the right position.
     */
    anchorAt(sIndex: u32, isAfter: boolean): Anchor {
        assert(() => isU32(sIndex), "index ∈ u32")

        sIndex = Math.min(sIndex, this.length)
        const it = this.blocks.atEqual(summaryFinder(sIndex), true)
        let value = it.value
        if (sIndex === it.summary && !isAfter) {
            return Anchor.BOTTOM
        } else if (
            value !== undefined &&
            sIndex === it.summary + value.length &&
            isAfter
        ) {
            it.forth()
            value = it.value
        }

        if (value === undefined) {
            return Anchor.TOP
        } else {
            if (!isAfter) {
                sIndex--
            }
            return value.anchor(sIndex - it.summary, !isAfter)
        }
    }

    /**
     * @param anchor
     * @return index of `anchor`.
     */
    indexFrom(anchor: Anchor): u32 {
        const it = this.blocks.atEqual(posFinder(anchor.ref), false)
        const value = it.value
        const sOffset = value !== undefined ? value.indexFrom(anchor) : 0
        return it.summary + sOffset
    }

    /**
     * @param delta operation of insertion insertion
     * @return operations of insertion that can be played such that an
     *  insertion is not played a second time.
     */
    insertable(iBlock: Block<E>): Block<E>[] {
        const it = this.blocks.atEqual(posFinder(iBlock.lowerPos), true)
        const result: Block<E>[] = []
        let iBlockPart: Block<E> | undefined = iBlock
        for (
            let curr = it.value;
            curr !== undefined && iBlockPart !== undefined;
            it.forth(), curr = it.value
        ) {
            switch (iBlockPart.compare(curr)) {
                case BlockOrdering.APPENDABLE:
                case BlockOrdering.AFTER:
                    break // do nothing
                case BlockOrdering.PREPENDABLE:
                case BlockOrdering.BEFORE:
                case BlockOrdering.SPLITTING:
                    result.push(iBlockPart)
                    iBlockPart = undefined
                    break
                case BlockOrdering.SPLITTED_BY: {
                    const [lSplit, rSplit] = iBlockPart.splitWith(curr) as [
                        Block<E>,
                        Block<E>
                    ] // FIXME: useless type assertion
                    result.push(lSplit)
                    iBlockPart = rSplit
                    break
                }
                case BlockOrdering.INCLUDING_RIGHT:
                case BlockOrdering.OVERLAPPING_BEFORE:
                    result.push(iBlockPart.prependable(curr))
                    iBlockPart = undefined
                    break
                case BlockOrdering.INCLUDING_LEFT:
                case BlockOrdering.OVERLAPPING_AFTER:
                    iBlockPart = iBlockPart.appendable(curr)
                    break
                case BlockOrdering.INCLUDING_MIDDLE: {
                    result.push(iBlockPart.prependable(curr))
                    iBlockPart = iBlockPart.appendable(curr)
                    break
                }
                case BlockOrdering.INCLUDED_MIDDLE_BY:
                case BlockOrdering.INCLUDED_RIGHT_BY:
                case BlockOrdering.INCLUDED_LEFT_BY:
                case BlockOrdering.EQUAL:
                    iBlockPart = undefined
                    break
                default:
                    throw new Error("non-exhaustive switch")
            }
        }
        if (iBlockPart !== undefined) {
            result.push(iBlockPart)
        }
        return result
    }
}
