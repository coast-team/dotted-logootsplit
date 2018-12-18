/*
    Copyright (C) 2018  Victorien Elvinger

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { readonly } from "./assert"
import { uint32 } from "./number"
import { Ordering } from "./ordering"

/**
 * Possible relation between two position bases.
 */
export const enum BaseOrdering {
    BEFORE = -2,
    PREFIXING = -1,
    EQUAL = 0,
    PREFIXED_BY = 1,
    AFTER = 2
}

/**
 * Inversion of BaseOrdering.
 */
export const baseOrderingInversion = readonly({
    [BaseOrdering.BEFORE]: BaseOrdering.AFTER,
    [BaseOrdering.PREFIXING]: BaseOrdering.PREFIXED_BY,
    [BaseOrdering.EQUAL]: BaseOrdering.EQUAL,
    [BaseOrdering.PREFIXED_BY]: BaseOrdering.PREFIXING,
    [BaseOrdering.AFTER]: BaseOrdering.BEFORE
})

/**
 * The set of positions is a dense totally ordered set.
 * The dot (replica, seq) uniquely identifies the position.
 *
 * A position can be represented as a lexcigraphic ordered list of hexadecimal.
 * The list without the last element is called the base of the position.
 * For instance:
 * p = [1, e, 3]
 * q = [1, e, 4]
 * r = [1, e, 4, 8]
 * p, q have the same base [1, e], and p < q
 * q, r have not the same base, and q < r.
 * However the base of q prefixes the base of r.
 *
 * Alternatively, a position can be represented as a positional hexadecimal.
 * p = .1e3 * 16^3
 * q = .1e4 * 16^3
 * r = .1e48 * 16^4
 *
 * Given a position, its n-th integer successor corresponds to the position plus
 * n. For example, q is the 1-th int successor of p. We say that the integer
 * distance between p and q is 1. Note that the integer distance from p to r is
 * approximated to 1.
 *
 * In documentation p.intSuccessor(n) can be shorten by p+n.
 */
export interface Pos <P extends Pos<P>> {
// Derivation
    /**
     * @param n 0-based index.
     * @return {@link n } -th integer successor of this.
     */
    readonly intSuccessor: (n: uint32) => P

// Access
    /**
     * Globally unique identifier of the author which generated this position.
     */
    readonly replica: uint32

    /**
     * When was generated this position.
     */
    readonly seq: uint32

    /**
     * @example
     * p.intDistance(p.intSuccessor(n)) == [n, Ordering.BEFORE]
     * p.intDistance(p) == [0, Ordering.EQUAL]
     * p.intSuccessor(n).intDistance(p) == [n, Ordering.AFTER]
     *
     * @param other
     *      this.compareBase(other) == BaseOrdering.PREFIXING |
     *          BaseOrdering.EQUAL | BaseOrdering.PREFIXED_BY
     * @return Integer distance from this to {@link other } and
     *  order between this and {@link other }.
     */
    readonly intDistance: (other: P) => [uint32, Ordering]

    /**
     * Hash code.
     */
    readonly digest: uint32

// Status
    /**
     * hasIntSuccessor(0) is always true.
     *
     * See also {@link Pos#intSuccessor }.
     *
     * @param n 0-based index.
     * @return is there a {@link n } -th integer successor?
     */
    readonly hasIntSuccessor: (n: uint32) => boolean

    /**
     * @param other
     * @return base of this [Order relation] base of {@link other }.
     */
    readonly compareBase: (other: P) => BaseOrdering

    /**
     * @param other
     * @return Are sharing the same base?
     */
    readonly isBaseEqual: (other: P) => boolean

    /**
     * @example
     * a.compare(b) == Ordering.Before if a < b
     *
     * @param other
     * @return this [Order relation] {@link other}.
     */
    readonly compare: (other: P) => Ordering

    /**
     * @param other
     * @return Are identical?
     */
    readonly isEqual: (other: P) => boolean
}
