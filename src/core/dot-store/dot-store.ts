import { u32 } from "../../util/number"
import { U32Range } from "../u32-range"

export interface DotStore {
    isAddable(replica: u32, seqs: U32Range): boolean

    addable(replica: u32, seqs: U32Range): U32Range[]

    add(replica: u32, seqs: U32Range): U32Range[]

    merge(other: DotStore): void
}
