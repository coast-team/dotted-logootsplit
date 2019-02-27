import { ExecutionContext, Macro } from "ava"
import { Pos, Ins, Del } from "../../src"
import { EditableOpReplicatedList } from "../../src/core/op-replicated-list"
import { EditableDeltaReplicatedList } from "../../src/core/delta-replicated-list"
import { DotPos } from "../../src/core/dot-pos"

export interface OpListFactory<P extends Pos<P>> {
    (replica: number, seed?: string): EditableOpReplicatedList<P, string>
}

export interface GenericOpListMacro {
    <P extends Pos<P>>(
        t: ExecutionContext,
        emp: OpListFactory<P>,
        id: string
    ): void

    title: (title: string | undefined, _: unknown, id: string) => string
}

export type OpListMacro<P extends Pos<P>> = Macro<[OpListFactory<P>, string]>

export type OpListMacros<P extends Pos<P>> = [
    OpListMacro<P>,
    ...OpListMacro<P>[]
]

export interface DeltaListFactory<P extends DotPos<P>> {
    (replica: number, seed?: string): EditableDeltaReplicatedList<P, string>
}

export interface GenericDeltaListMacro {
    <P extends DotPos<P>>(
        t: ExecutionContext,
        emp: DeltaListFactory<P>,
        id: string
    ): void

    title: (title: string | undefined, _: unknown, id: string) => string
}

export type DeltaListMacro<P extends DotPos<P>> = Macro<
    [DeltaListFactory<P>, string]
>

export type DeltaListMacros<P extends DotPos<P>> = [
    DeltaListMacro<P>,
    ...DeltaListMacro<P>[]
]

const titled = (defaultTitle: string) => (
    title = defaultTitle,
    ...rest: unknown[]
): string => `${rest[rest.length - 1]}_${title}`

export const enum Peer {
    A = 1,
    B = 2,
    C = 3,
    D = 4,
}

// empty list

export const mEmpty: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)

    t.is(seqA.concatenated(""), "")
    t.is(seqA.length, 0)
}
mEmpty.title = titled("empty")

// inserAt

export const mInsertAtRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ab")
    seqA.insertAt(2, "cd")
    seqA.insertAt(4, "ef")

    t.is(seqA.concatenated(""), "abcdef")
    t.is(seqA.length, 6)
}
mInsertAtRight.title = titled("insert-at-right")

export const mInsertAtLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ef")
    seqA.insertAt(0, "cd")
    seqA.insertAt(0, "ab")

    t.is(seqA.concatenated(""), "abcdef")
    t.is(seqA.length, 6)
}
mInsertAtLeft.title = titled("insert-at-left")

export const mInsertAtBoth: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ef")
    seqA.insertAt(0, "ab")
    seqA.insertAt(4, "ij")
    seqA.insertAt(2, "cd")
    seqA.insertAt(6, "gh")

    t.is(seqA.concatenated(""), "abcdefghij")
    t.is(seqA.length, 10)
}
mInsertAtBoth.title = titled("insert-at-both")

export const mInsertAtSplit: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ce")
    seqA.insertAt(0, "a")
    seqA.insertAt(3, "g")
    seqA.insertAt(1, "b")
    seqA.insertAt(4, "f")
    seqA.insertAt(3, "d") // split "ce"

    t.is(seqA.concatenated(""), "abcdefg")
    t.is(seqA.length, 7)
}
mInsertAtSplit.title = titled("insert-at-between")

export const mInsertAtMultiple: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "c")
    seqA.insertAt(0, "b")
    seqA.insertAt(2, "d")
    seqA.insertAt(0, "a")
    seqA.insertAt(4, "e")

    t.is(seqA.concatenated(""), "abcde")
    t.is(seqA.length, 5)
}
mInsertAtMultiple.title = titled("insert-at-multiple")

// insert

export const mInsertSingle: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    const ins = seqB.insert(ab)

    t.is(ab.items, "ab")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(ins, [new Ins(0, "ab")])
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertSingle.title = titled("insert-single")

export const mInsertReplayed: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)

    t.throws(() => seqB.insert(ab))
}
mInsertReplayed.title = titled("insert-replayed")

export const mInsertAppend: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const [ab, cd] = seqA.insertAt(0, "abcd").splitAt(2)

    const seqB = emp(Peer.B)
    const abIns = seqB.insert(ab)
    const cdIns = seqB.insert(cd)

    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(abIns, [new Ins(0, "ab")])
    t.deepEqual(cdIns, [new Ins(2, "cd")])
}
mInsertAppend.title = titled("insert-append")

export const mInsertPrepend: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const [ab, cd] = seqA.insertAt(0, "abcd").splitAt(2)

    const seqB = emp(Peer.B)
    const cdIns = seqB.insert(cd)
    const abIns = seqB.insert(ab)

    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(cdIns, [new Ins(0, "cd")])
    t.deepEqual(abIns, [new Ins(0, "ab")])
}
mInsertPrepend.title = titled("insert-prepend")

export const mInsertAppendPrepend: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const [ab, cdef] = seqA.insertAt(0, "abcdef").splitAt(2)
    const [cd, ef] = cdef.splitAt(2)

    const seqB = emp(Peer.B)
    const abIns = seqB.insert(ab)
    const efIns = seqB.insert(ef)
    const cdIns = seqB.insert(cd)

    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(abIns, [new Ins(0, "ab")])
    t.deepEqual(efIns, [new Ins(2, "ef")])
    t.deepEqual(cdIns, [new Ins(2, "cd")])
}
mInsertAppendPrepend.title = titled("insert-append-prepend")

export const mInsertSplitting: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const bd = seqA.insertAt(0, "bd")
    const a = seqA.insertAt(0, "a")
    const e = seqA.insertAt(3, "e")
    const c = seqA.insertAt(2, "c")

    const seqB = emp(Peer.B)
    seqB.insert(bd)
    seqB.insert(a)
    seqB.insert(e)
    const cIns = seqB.insert(c)

    t.is(seqA.concatenated(""), "abcde")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.is(seqA.length, 5)
    t.deepEqual(cIns, [new Ins(2, "c")])
}
mInsertSplitting.title = titled("insert-splitting")

export const mInsertSplitted: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ac = seqA.insertAt(0, "ac")
    const b = seqA.insertAt(1, "b")

    const seqB = emp(Peer.B)
    seqB.insert(b)
    const acIns = seqB.insert(ac)

    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.is(seqA.length, 3)

    let exepctedIns
    if (acIns.length > 1 && acIns[0].items === "c") {
        exepctedIns = [new Ins(1, "c"), new Ins(0, "a")]
    } else {
        exepctedIns = [new Ins(0, "a"), new Ins(2, "c")]
    }
    t.deepEqual(acIns, exepctedIns)
}
mInsertSplitted.title = titled("insert-splitted")

export const mInsertDoublySplitted: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ace = seqA.insertAt(0, "ace")
    const d = seqA.insertAt(2, "d")
    const b = seqA.insertAt(1, "b")

    const seqB = emp(Peer.B)
    seqB.insert(b)
    seqB.insert(d)
    const aceIns = seqB.insert(ace) // doubly splitted

    t.is(seqA.concatenated(""), "abcde")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())

    let exepctedIns
    if (aceIns.length > 1 && aceIns[0].items === "e") {
        exepctedIns = [new Ins(2, "e"), new Ins(1, "c"), new Ins(0, "a")]
    } else {
        exepctedIns = [new Ins(0, "a"), new Ins(2, "c"), new Ins(4, "e")]
    }
    t.deepEqual(aceIns, exepctedIns)
}
mInsertDoublySplitted.title = titled("insert-doubly-splitted")

export const mInsertAppendSplitted: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const [ab, ce] = seqA.insertAt(0, "abce").splitAt(2)
    const d = seqA.insertAt(3, "d") // split "ce"

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    seqB.insert(d)
    const ceIns = seqB.insert(ce) // splitted by "d"

    t.is(seqA.concatenated(""), "abcde")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())

    let exepctedIns
    if (ceIns.length > 1 && ceIns[0].items === "e") {
        exepctedIns = [new Ins(3, "e"), new Ins(2, "c")]
    } else {
        exepctedIns = [new Ins(2, "c"), new Ins(4, "e")]
    }
    t.deepEqual(ceIns, exepctedIns)
}
mInsertAppendSplitted.title = titled("insert-append-splitted")

export const mInsertPrependSplitted: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const [ac, de] = seqA.insertAt(0, "acde").splitAt(2)
    const b = seqA.insertAt(1, "b") // split "de"

    const seqB = emp(Peer.B)
    seqB.insert(de)
    seqB.insert(b)
    const acIns = seqB.insert(ac) // splitted by "b"

    t.is(seqA.concatenated(""), "abcde")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())

    let exepctedIns
    if (acIns.length > 1 && acIns[0].items === "c") {
        exepctedIns = [new Ins(1, "c"), new Ins(0, "a")]
    } else {
        exepctedIns = [new Ins(0, "a"), new Ins(2, "c")]
    }
    t.deepEqual(acIns, exepctedIns)
}
mInsertPrependSplitted.title = titled("insert-prepend-splitted")

export const mInsertIncluded: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcdef = seqA.insertAt(0, "abcdef")
    const cd = abcdef.rightSplitAt(2).leftSplitAt(2)

    const seqB = emp(Peer.B)

    seqB.insert(abcdef)

    t.throws(() => seqB.insert(cd))
}
mInsertIncluded.title = titled("insert-included")

export const mInsertIncluding: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcdef = seqA.insertAt(0, "abcdef")
    const cd = abcdef.rightSplitAt(2).leftSplitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(cd)

    t.throws(() => seqB.insert(abcdef))
}
mInsertIncluding.title = titled("insert-including")

export const mInsertOverlappingAfter: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    const ab = abc.leftSplitAt(2)
    const bc = abc.rightSplitAt(1)

    const seqB = emp(Peer.B)
    seqB.insert(ab)

    t.throws(() => seqB.insert(bc))
}
mInsertOverlappingAfter.title = titled("insert-overlapping-after")

export const mInsertOverlappingBefore: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    const ab = abc.leftSplitAt(2)
    const bc = abc.rightSplitAt(1)

    const seqB = emp(Peer.B)
    seqB.insert(bc)

    t.throws(() => seqB.insert(ab))
}
mInsertOverlappingBefore.title = titled("insert-overlapping-before")

// insert by separate peers

export const mInsertAfter: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    const _12 = seqB.insertAt(2, "12")

    seqA.insert(_12)

    t.is(seqA.concatenated(""), "ab12")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertAfter.title = titled("insert-after")

export const mInsertBefore: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    const _12 = seqB.insertAt(0, "12")

    seqA.insert(_12)

    t.is(seqA.concatenated(""), "12ab")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertBefore.title = titled("insert-before")

// concurrent insert

export const mInsertConcurrent: GenericOpListMacro = (t, emp) => {
    const seed = "seed"
    const seqA = emp(Peer.A, seed)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B, seed)
    const _12 = seqB.insertAt(0, "12")

    seqA.insert(_12)

    seqB.insert(ab)

    t.is(seqA.concatenated(""), "ab12")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertConcurrent.title = titled("insert-concurrent")

export const mInsertConcurrentAppend: GenericOpListMacro = (t, emp) => {
    const seed = "seed"
    const seqA = emp(Peer.A, seed)
    const ab = seqA.insertAt(0, "ab")
    const cd = seqA.insertAt(2, "cd")

    const seqB = emp(Peer.B, seed)
    const _12 = seqB.insertAt(0, "12")
    const _34 = seqB.insertAt(2, "34")
    seqB.insert(ab)
    seqB.insert(cd)

    seqA.insert(_12)
    seqA.insert(_34)

    t.is(seqA.concatenated(""), "abcd1234")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertConcurrentAppend.title = titled("insert-concurrent-append")

export const mInsertConcurrentPrepend: GenericOpListMacro = (t, emp) => {
    const seed = "seed"
    const seqA = emp(Peer.A, seed)
    const ab = seqA.insertAt(0, "ab")
    const cd = seqA.insertAt(2, "cd")

    const seqB = emp(Peer.B, seed)
    const _12 = seqB.insertAt(0, "12")
    const _34 = seqB.insertAt(2, "34")
    seqB.insert(cd)
    seqB.insert(ab)

    seqA.insert(_34)
    seqA.insert(_12)

    t.is(seqA.concatenated(""), "abcd1234")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mInsertConcurrentPrepend.title = titled("insert-concurrent-prepend")

// removeAt

export const mRemoveAtEqual: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")
    seqA.removeAt(0, 3) // remove "abc"

    t.is(seqA.concatenated(""), "")
    t.is(seqA.length, 0)
}
mRemoveAtEqual.title = titled("remove-at-equal")

export const mRemoveAtEqualMerge: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")

    const seqB = emp(Peer.B)
    seqB.insert(abcd)
    seqB.insertAt(2, "12") // split "abcd"
    seqB.removeAt(2, 2) // remove "12"

    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveAtEqualMerge.title = titled("remove-at-equal-merge")

export const mRemoveAtJustBefore: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    seqB.insertAt(0, "12")
    seqB.removeAt(0, 2) // remove "12"

    t.is(seqA.concatenated(""), "ab")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveAtJustBefore.title = titled("remove-at-just-before")

export const mRemoveAtBefore: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    seqB.insertAt(0, "12")
    seqB.removeAt(0, 1) // remove "1"

    t.is(seqB.concatenated(""), "2ab")
}
mRemoveAtBefore.title = titled("remove-at-before")

export const mRemoveAtJustAfter: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    seqB.insertAt(2, "12")
    seqB.removeAt(2, 2) // remove "12"

    t.is(seqA.concatenated(""), "ab")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveAtJustAfter.title = titled("remove-at-just-after")

export const mRemoveAtAfter: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    seqB.insertAt(2, "12")
    seqB.removeAt(3, 1) // remove "2"

    t.is(seqB.concatenated(""), "ab1")
}
mRemoveAtAfter.title = titled("remove-at-after")

export const mRemoveAtIncludedLeftBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")
    seqA.removeAt(0, 2) // remove "ab"

    t.is(seqA.concatenated(""), "c")
    t.is(seqA.length, 1)
}
mRemoveAtIncludedLeftBy.title = titled("remove-at-included-left-by")

export const mRemoveAtIncludedMiddleBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")
    seqA.removeAt(1, 1) // remove "b"

    t.is(seqA.concatenated(""), "ac")
    t.is(seqA.length, 2)
}
mRemoveAtIncludedMiddleBy.title = titled("remove-at-included-middle-by")

export const mRemoveAtIncludedRightBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")
    seqA.removeAt(1, 2) // remove "bc"

    t.is(seqA.concatenated(""), "a")
    t.is(seqA.length, 1)
}
mRemoveAtIncludedRightBy.title = titled("remove-at-included-right-by")

export const mRemoveAtIncludingLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")

    const seqB = emp(Peer.B)
    seqB.insert(abc)
    seqB.insertAt(3, "def")
    seqB.removeAt(0, 4) // remove "abc" and "d"

    t.is(seqB.concatenated(""), "ef")
    t.is(seqB.length, 2)
}
mRemoveAtIncludingLeft.title = titled("remove-at-including-left")

export const mRemoveAtIncludingMiddle: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const def = seqA.insertAt(0, "def")

    const seqB = emp(Peer.B)
    seqB.insert(def)
    seqB.insertAt(3, "ghi")
    seqB.insertAt(0, "abc")
    seqB.removeAt(2, 5) // remove "c", "def", and "g"

    t.is(seqB.concatenated(""), "abhi")
}
mRemoveAtIncludingMiddle.title = titled("remove-at-including-middle")

export const mRemoveAtIncludingRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const def = seqA.insertAt(0, "def")

    const seqB = emp(Peer.B)
    seqB.insert(def)
    seqB.insertAt(0, "abc")
    seqB.removeAt(2, 4) // remove "c" and "def"

    t.is(seqB.concatenated(""), "ab")
}
mRemoveAtIncludingRight.title = titled("remove-at-including-right")

export const mRemoveAtMultiple: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ef")
    seqA.insertAt(0, "ab")
    seqA.insertAt(4, "ij")
    seqA.insertAt(2, "cd")
    seqA.insertAt(6, "gh")
    seqA.removeAt(1, 8)

    t.is(seqA.concatenated(""), "aj")
    t.is(seqA.length, 2)
}
mRemoveAtMultiple.title = titled("remove-at-multiple")

// remove

export const mRemoveNothing: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "ab")
    const [abRmv] = seqA.removeAt(0, 2) // remove "ab"

    const seqB = emp(Peer.B)
    const abLocalRemoval = seqB.remove(abRmv)

    t.is(seqA.concatenated(""), "")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(abLocalRemoval, [])
}
mRemoveNothing.title = titled("remove-nothing")

export const mRemoveEqual: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")

    const cdRmv = seqA.remove(abcd.toLengthBlock())

    t.is(seqA.concatenated(""), "")
    t.deepEqual(cdRmv, [new Del(0, 4)])
}
mRemoveEqual.title = titled("remove-equal")

export const mRemoveIncludedLeftBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const ab = abcd.leftSplitAt(2)

    const abRmv = seqA.remove(ab.toLengthBlock())

    t.is(seqA.concatenated(""), "cd")
    t.deepEqual(abRmv, [new Del(0, 2)])
}
mRemoveIncludedLeftBy.title = titled("remove-included-left-by")

export const mRemoveIncludedMiddleBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const bcd = abcd.rightSplitAt(1)
    const bc = bcd.leftSplitAt(2)

    const bcRmv = seqA.remove(bc.toLengthBlock())

    t.is(seqA.concatenated(""), "ad")
    t.deepEqual(bcRmv, [new Del(1, 2)])
}
mRemoveIncludedMiddleBy.title = titled("remove-included-middle-by")

export const mRemoveIncludedRightBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const cd = abcd.rightSplitAt(2)

    const cdRmv = seqA.remove(cd.toLengthBlock())

    t.is(seqA.concatenated(""), "ab")
    t.deepEqual(cdRmv, [new Del(2, 2)])
}
mRemoveIncludedRightBy.title = titled("remove-included-right-by")

export const mRemoveIncludingLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const ab = abcd.leftSplitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    const abRmv = seqB.remove(abcd.toLengthBlock())

    t.is(seqB.concatenated(""), "")
    t.deepEqual(abRmv, [new Del(0, 2)])
}
mRemoveIncludingLeft.title = titled("remove-including-left")

export const mRemoveIncludingMiddle: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const bcd = abcd.rightSplitAt(1)
    const bc = bcd.leftSplitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(bc)
    const bcRmv = seqB.remove(abcd.toLengthBlock())

    t.is(seqB.concatenated(""), "")
    t.deepEqual(bcRmv, [new Del(0, 2)])
}
mRemoveIncludingMiddle.title = titled("remove-including-middle")

export const mRemoveIncludingRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const cd = abcd.rightSplitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(cd)
    const cdRmv = seqB.remove(abcd.toLengthBlock())

    t.is(seqB.concatenated(""), "")
    t.deepEqual(cdRmv, [new Del(0, 2)])
}
mRemoveIncludingRight.title = titled("remove-including-right")

export const mRemoveOverlappingLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const ab = abcd.leftSplitAt(2)
    const bcd = abcd.rightSplitAt(1)

    const seqB = emp(Peer.B)
    seqB.insert(ab)
    const bRmv = seqB.remove(bcd.toLengthBlock())

    t.is(seqB.concatenated(""), "a")
    t.deepEqual(bRmv, [new Del(1, 1)])
}
mRemoveOverlappingLeft.title = titled("remove-overlapping-left")

export const mRemoveOverlappingRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const cd = abcd.rightSplitAt(2)
    const abc = abcd.leftSplitAt(3)

    const seqB = emp(Peer.B)
    seqB.insert(cd)
    const cRmv = seqB.remove(abc.toLengthBlock())

    t.is(seqB.concatenated(""), "d")
    t.deepEqual(cRmv, [new Del(0, 1)])
}
mRemoveOverlappingRight.title = titled("remove-overlapping-right")

export const mRemoveSplitting: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abef = seqA.insertAt(0, "abef")

    const seqB = emp(Peer.B)
    seqB.insert(abef)
    const cd = seqB.insertAt(2, "cd") // split

    seqA.remove(cd.toLengthBlock()) // no effect
    seqB.remove(cd.toLengthBlock())

    t.is(seqA.concatenated(""), "abef")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveSplitting.title = titled("remove-splitting")

export const mRemoveSplittedBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abef = seqA.insertAt(0, "abef")

    const seqB = emp(Peer.B)
    seqB.insert(abef)
    const cd = seqB.insertAt(2, "cd") // split

    seqA.remove(abef.toLengthBlock())
    seqB.remove(abef.toLengthBlock())

    seqA.insert(cd)

    t.is(seqA.concatenated(""), "cd")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveSplittedBy.title = titled("remove-splitted-by")

export const mRemoveAfterBeforeMerge: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abefij = seqA.insertAt(0, "abefij")
    const [ab, efij] = abefij.splitAt(2)
    const [ef, ij] = efij.splitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(ef)
    const gh = seqB.insertAt(2, "gh")
    const cd = seqB.insertAt(0, "cd")
    seqB.insert(ij)
    seqB.insert(ab)

    seqB.remove(gh.toLengthBlock())
    seqB.remove(cd.toLengthBlock())

    t.is(seqA.concatenated(""), "abefij")
    t.is(seqA.concatenated(""), seqB.concatenated(""))
    t.is(seqA.structuralDigest(), seqB.structuralDigest())
}
mRemoveAfterBeforeMerge.title = titled("remove-efter-before-merge")

// insertable

export const mInsertertableEqual: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const ab = seqA.insertAt(0, "ab")

    t.deepEqual(seqA.insertable(ab), [])
}
mInsertertableEqual.title = titled("insertable-equal")

export const mInsertertableIncludedLeftBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const ab = abcd.leftSplitAt(2)

    t.deepEqual(seqA.insertable(ab), [])
}
mInsertertableIncludedLeftBy.title = titled("insertable-included-left-by")

export const mInsertertableIncludedMiddleBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const cd = abcd.rightSplitAt(2)
    const c = cd.leftSplitAt(1)

    t.deepEqual(seqA.insertable(c), [])
}
mInsertertableIncludedMiddleBy.title = titled("insertable-included-middle-by")

export const mInsertertableIncludedRightBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const cd = abcd.rightSplitAt(2)

    t.deepEqual(seqA.insertable(cd), [])
}
mInsertertableIncludedRightBy.title = titled("insertable-included-right-by")

export const mInsertertableIncludingLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const [ab, cd] = abcd.splitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(cd)

    t.deepEqual(seqB.insertable(abcd), [ab])
}
mInsertertableIncludingLeft.title = titled("insertable-including-left")

export const mInsertertableIncludingMiddle: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const [abc, d] = abcd.splitAt(3)
    const [a, bc] = abc.splitAt(1)

    const seqB = emp(Peer.B)
    seqB.insert(bc)

    t.deepEqual(seqB.insertable(abcd), [a, d])
}
mInsertertableIncludingMiddle.title = titled("insertable-including-middle")

export const mInsertertableIncludingRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const [ab, cd] = abcd.splitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(ab)

    t.deepEqual(seqB.insertable(abcd), [cd])
}
mInsertertableIncludingRight.title = titled("insertable-including-right")

export const mInsertertableOverlappingLeft: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const abc = abcd.leftSplitAt(3)
    const [ab, cd] = abcd.splitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(cd)

    t.deepEqual(seqB.insertable(abc), [ab])
}
mInsertertableOverlappingLeft.title = titled("insertable-overlapping-left")

export const mInsertertableOverlappingRight: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abcd = seqA.insertAt(0, "abcd")
    const bcd = abcd.rightSplitAt(1)
    const cd = abcd.rightSplitAt(2)

    const seqB = emp(Peer.B)
    seqB.insert(cd)

    t.deepEqual(seqB.insertable(bcd), [cd])
}
mInsertertableOverlappingRight.title = titled("insertable-overlapping-right")

export const mInsertertableSplittedBy: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abef = seqA.insertAt(0, "abef")
    const [ab, ef] = abef.splitAt(2)
    const cd = seqA.insertAt(2, "cd") // split

    const seqB = emp(Peer.B)
    seqB.insert(cd)

    t.deepEqual(seqB.insertable(abef), [ab, ef])
}
mInsertertableSplittedBy.title = titled("insertable-splitted-by")

export const mInsertertableSplitting: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abef = seqA.insertAt(0, "abef")
    const cd = seqA.insertAt(2, "cd") // split

    const seqB = emp(Peer.B)
    seqB.insert(abef)

    t.deepEqual(seqB.insertable(cd), [cd])
}
mInsertertableSplitting.title = titled("insertable-splitting")

export const mInsertertableAfterBefore: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const cd = seqA.insertAt(0, "cd")

    const seqB = emp(Peer.B)
    seqB.insert(cd)
    const ef = seqB.insertAt(2, "ef")
    const ab = seqB.insertAt(0, "ab")

    t.deepEqual(seqA.insertable(ab), [ab])
    t.deepEqual(seqA.insertable(ef), [ef])
}
mInsertertableAfterBefore.title = titled("insertable-efter-before")

export const mInsertertableAppednable: GenericOpListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    const [a, bc] = abc.splitAt(1)
    const [b, c] = bc.splitAt(1)

    const seqB = emp(Peer.B)
    seqB.insert(b)

    t.deepEqual(seqB.insertable(a), [a])
    t.deepEqual(seqB.insertable(c), [c])
}
mInsertertableAppednable.title = titled("insertable-appendable")

// applyDelta

export const mApplyDeltaTwice: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    seqA.applyDelta(abc)

    const seqB = emp(Peer.B)
    seqB.applyDelta(abc)
    seqB.applyDelta(abc)

    t.deepEqual(seqA.concatenated(""), "abc")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
}
mApplyDeltaTwice.title = titled("apply-delta-twice")

export const mApplyDeltaRemoveInsert: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    seqA.applyDelta(abc.toLengthBlock())

    const seqB = emp(Peer.B)
    seqB.applyDelta(abc.toLengthBlock())
    seqB.applyDelta(abc)

    t.deepEqual(seqA.concatenated(""), "")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
}
mApplyDeltaRemoveInsert.title = titled("apply-delta-remove-insert")

export const mApplyDeltaInsertRemove: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    seqA.applyDelta(abc.toLengthBlock())

    const seqB = emp(Peer.B)
    seqB.applyDelta(abc)
    seqB.applyDelta(abc.toLengthBlock())

    t.deepEqual(seqA.concatenated(""), "")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
}
mApplyDeltaInsertRemove.title = titled("apply-delta-insert-remove")

export const mApplyDeltaPartRemoveInsert: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")
    const a = abc.leftSplitAt(1)
    seqA.applyDelta(a.toLengthBlock())

    const seqB = emp(Peer.B)
    seqB.applyDelta(a.toLengthBlock())
    seqB.applyDelta(abc)

    t.deepEqual(seqA.concatenated(""), "bc")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
}
mApplyDeltaPartRemoveInsert.title = titled("apply-delta-part-remove-insert")

// merge

export const mMergeSimple: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")

    const seqB = emp(Peer.B)
    const opB = seqB.merge(seqA)

    t.deepEqual(seqA.concatenated(""), "abc")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(opB, [new Ins(0, "abc")])
}
mMergeSimple.title = titled("merge-simple")

export const mMergeIdempotent: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    seqA.insertAt(0, "abc")
    const opA = seqA.merge(seqA)

    const seqB = emp(Peer.B)
    const opB = seqB.merge(seqA)

    t.deepEqual(seqA.concatenated(""), "abc")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(opA, [])
    t.deepEqual(opB, [new Ins(0, "abc")])
}
mMergeIdempotent.title = titled("merge-simple-idempotent")

export const mMerge: GenericDeltaListMacro = (t, emp) => {
    const seqA = emp(Peer.A)
    const abc = seqA.insertAt(0, "abc")

    const seqB = emp(Peer.B)
    seqB.applyDelta(abc)
    const def = seqB.insertAt(3, "def")
    seqB.insertAt(6, "g")
    seqB.removeAt(0, 1)

    seqA.applyDelta(def)
    seqA.removeAt(5, 1)

    const opA = seqA.merge(seqB)
    const opB = seqB.merge(seqA)

    t.deepEqual(seqA.concatenated(""), "bcdeg")
    t.deepEqual(seqA.concatenated(""), seqB.concatenated(""))
    t.deepEqual(seqA.structuralDigest(), seqB.structuralDigest())
    t.deepEqual(opA, [new Ins(5, "g"), new Del(0, 1)])
    t.deepEqual(opB, [new Del(4, 1)])
}
mMerge.title = titled("merge")
