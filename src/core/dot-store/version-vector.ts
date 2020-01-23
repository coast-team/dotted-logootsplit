import { DotStore } from "./dot-store"
import { U32Range } from "../u32-range"
import { assert } from "../../util/assert"
import { u32 } from "../../util/number"

export class VersionVector implements DotStore {
    protected readonly map: { [replica: string]: u32 | undefined }

    protected constructor(map: {}) {
        this.map = map
    }

    readonlyMap(): { readonly [replica: string]: u32 | undefined } {
        return this.map
    }

    lastSeq(replica: string): u32 {
        const maybeLastSeq = this.map[replica]
        if (maybeLastSeq !== undefined) {
            return maybeLastSeq
        }
        return 0
    }

    isAddable(replica: u32, seqs: U32Range): boolean {
        const lastSeq = this.lastSeq(String(replica))
        return seqs.lower <= lastSeq + 1
    }

    addable(replica: u32, seqs: U32Range): U32Range[] {
        const lastSeq = this.lastSeq(String(replica))
        if (seqs.lower > lastSeq) {
            return [seqs]
        } else if (seqs.upper() > lastSeq) {
            const remaining = U32Range.fromBounds(lastSeq + 1, seqs.upper())
            return [remaining]
        }
        return [] // already added
    }

    add(replica: u32, seqs: U32Range): U32Range[] {
        assert(() => this.isAddable(replica, seqs), "seqs is addable")
        const result = this.addable(replica, seqs)
        if (result.length > 0) {
            this.map[replica] = result[0].upper()
        }
        return result
    }

    merge(other: DotStore): void {
        if (other instanceof VersionVector) {
            const otherMap = other.readonlyMap()
            for (const replica in otherMap) {
                const seq = other.lastSeq(replica)
                this.map[replica] = Math.max(this.lastSeq(replica), seq)
            }
        }
        throw new Error("non-compatible implementations")
    }
}
