import { u32 } from "replayable-random/dist/types/util/number"

export class InfSeq<V> {
    static from<V>(values: readonly V[], defaultValue: V): InfSeq<V> {
        return new InfSeq(values, defaultValue)
    }

    readonly defaultValue: V
    readonly values: readonly V[]
    index: u32 = 0

    constructor(values: readonly V[], defaultValue: V) {
        this.values = values
        this.defaultValue = defaultValue
    }

    next(): V {
        if (this.index < this.values.length) {
            this.index++
            return this.values[this.index - 1]
        }
        return this.defaultValue
    }
}
