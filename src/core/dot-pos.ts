import { u32 } from "../util/number"
import { Pos } from "./pos"

/**
 * Position that can be uniquely identified with a dot (replica, seq).
 */
export interface DotPos<P extends DotPos<P>> extends Pos<P> {
    /**
     * When was generated this position.
     *
     * For convenience seq must be strictly positive.
     * This enables to use `0` as default value in causal contexts.
     */
    readonly seq: () => u32
}
