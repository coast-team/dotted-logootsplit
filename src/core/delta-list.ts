import { FromPlain, isObject } from "../util/data-validation.js"
import { isU32, u32 } from "../util/number.js"
import type { Anchor } from "./anchor.js"
import type { Block, LengthBlock } from "./block.js"
import type { Concat } from "./concat.js"
import { OpList, fromPlain as opListFromPlain } from "./op-list.js"

/**
 * @param opFromPlain
 * @return function that accepts a value and attempt to build a list.
 *  It returns the built list if it succeeds, or undefined if it fails.
 */
export const fromPlain = <E extends Concat<E>>(
    itemFromPlain: FromPlain<E>
): FromPlain<DeltaList<E>> => {
    return (x) => {
        if (
            isObject<{ list: unknown; versionVector: unknown }>(x) &&
            isObject<{ [r: string]: unknown }>(x.versionVector)
        ) {
            const versionVector: { [r: string]: u32 } = Object.create(null)
            for (const replica in x.versionVector) {
                if (x.versionVector.hasOwnProperty(replica)) {
                    const seq = x.versionVector[replica]
                    if (isU32(seq)) {
                        versionVector[replica] = seq
                    }
                }
            }
            const list = opListFromPlain(itemFromPlain)(x.list)
            if (list !== undefined) {
                return new DeltaList(list, versionVector)
            }
        }
        return undefined
    }
}

export class DeltaList<E extends Concat<E>> {
    // Access
    protected readonly list: OpList<E>

    /**
     * Map replica to their last observed seq.
     */
    protected readonly versionVector: { [replica: string]: u32 | undefined }

    constructor(list: OpList<E>, vv: { [r: string]: u32 }) {
        this.list = list
        this.versionVector = vv
    }

    readonlyVersionvector(): { readonly [replica: string]: u32 | undefined } {
        return this.versionVector
    }

    get length(): u32 {
        return this.list.length
    }

    reduceBlock<U>(f: (acc: U, b: Block<E>) => U, prefix: U): U {
        return this.list.reduceBlock(f, prefix)
    }

    /**
     * @param prefix
     * @return Concatenated version prefixed by `prefix`.
     */
    concatenated(prefix: E): E {
        return this.list.concatenated(prefix)
    }

    /**
     * Non-cryptographic way to approximate object identity.
     * Do not take the blocks' content into account.
     */
    structuralHashCode(): u32 {
        return this.list.structuralHashCode()
    }

    /**
     * @param index index where the anchor is
     * @param isAfter Is the anchor after `index`?
     * @return anchor at `index`.
     *  The anchor is sticked to the left position if isAfter is false.
     * Otherwise, it is sticked to the right position.
     */
    anchorAt(index: u32, isAfter: boolean): Anchor {
        return this.list.anchorAt(index, isAfter)
    }

    /**
     * @param anchor
     * @return index of `anchor`.
     */
    indexFrom(anchor: Anchor): u32 {
        return this.list.indexFrom(anchor)
    }

    protected lastSeq(replica: string): u32 {
        const maybeLastSeq = this.versionVector[replica]
        if (maybeLastSeq !== undefined) {
            return maybeLastSeq
        }
        return 0
    }

    /**
     * Complexity: O(1)
     *
     * @param delta
     * @return parts of `delta` that can be inserted.
     */
    insertable(delta: Block<E>): Block<E>[] {
        const lastSeq = this.lastSeq(String(delta.replica()))
        const deltaSeqs = delta.seqs()
        if (deltaSeqs.lower > lastSeq) {
            return [delta]
        } else if (deltaSeqs.upper() > lastSeq) {
            const remaining = delta.rightSplitAt(lastSeq + 1 - deltaSeqs.lower)
            return [remaining]
        }
        return []
    }

    /**
     * Complexity: O(S) where S depends of the chosen implementation.
     * e.g. for a balanced tree: S = log2(N) with N the number of blocks.
     *
     * @param delta
     * @return parts of `delta` that was removed.
     */
    removed(delta: Block<E>): LengthBlock[] {
        const lastSeq = this.lastSeq(String(delta.replica()))
        const deltaSeqs = delta.seqs()
        if (deltaSeqs.lower > lastSeq) {
            return []
        } else if (deltaSeqs.upper() > lastSeq) {
            const splittingIndex = lastSeq + 1 - deltaSeqs.lower
            const remaining = delta.leftSplitAt(splittingIndex)
            return this.list.insertable(remaining).map((block) => {
                return block.toLengthBlock()
            })
        }
        return this.list.insertable(delta).map((block) => {
            return block.toLengthBlock()
        })
    }
}
