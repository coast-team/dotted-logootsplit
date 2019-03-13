import test from "ava"

import {
    mEmpty,
    mInsertAtRight,
    mInsertAtLeft,
    mInsertAtSplit,
    OpListMacros,
    mInsertSingle,
    mInsertAppend,
    mInsertPrepend,
    mInsertAtBoth,
    mInsertConcurrent,
    mInsertConcurrentAppend,
    mInsertConcurrentPrepend,
    mInsertSplitting,
    mInsertSplitted,
    mInsertAppendSplitted,
    mInsertPrependSplitted,
    mInsertDoublySplitted,
    mInsertReplayed,
    mInsertAfter,
    mInsertBefore,
    mInsertIncluded,
    mInsertOverlappingAfter,
    mInsertOverlappingBefore,
    mRemoveAtEqual,
    mRemoveAtIncludedLeftBy,
    mRemoveAtIncludedRightBy,
    mInsertIncluding,
    mRemoveAtMultiple,
    mRemoveNothing,
    mRemoveAtJustAfter,
    mRemoveIncludedMiddleBy,
    mRemoveIncludedLeftBy,
    mRemoveIncludedRightBy,
    mRemoveIncludingLeft,
    mRemoveIncludingRight,
    mRemoveIncludingMiddle,
    mRemoveEqual,
    mRemoveAtIncludedMiddleBy,
    mRemoveAtEqualMerge,
    mRemoveAtIncludingLeft,
    mRemoveAtIncludingMiddle,
    mRemoveAtIncludingRight,
    mRemoveAtJustBefore,
    mRemoveAtAfter,
    mRemoveAtBefore,
    mRemoveSplitting,
    mRemoveSplittedBy,
    mRemoveOverlappingLeft,
    mRemoveOverlappingRight,
    mInsertAtMultiple,
    mInsertertableEqual,
    mInsertertableIncludedLeftBy,
    mInsertertableIncludedMiddleBy,
    mInsertertableIncludedRightBy,
    mInsertertableIncludingLeft,
    mInsertertableIncludingMiddle,
    mInsertertableIncludingRight,
    mInsertertableSplittedBy,
    mInsertertableSplitting,
    mInsertertableAfterBefore,
    mInsertertableAppednable,
    mRemoveAfterBeforeMerge,
    mMergeSimple,
    mMergeIdempotent,
    mMerge,
    mApplyDeltaInsertRemove,
    mApplyDeltaPartRemoveInsert,
    mApplyDeltaRemoveInsert,
    mApplyDeltaTwice,
    DeltaListMacros,
} from "../macro"
import {
    SimpleDotBlockFactory,
    SimpleDotPos,
    DeltaEditableReplicatedList,
} from "../../../src"
import { OpEditableReplicatedList } from "../../../src/core/op-replicated-list"
import { linked } from "../../../src/"

const DEFAULT_SEED = "dotted-logootsplit"

const ID = "linked"

function emptyOpSeq(
    replica: number,
    seed: string = DEFAULT_SEED
): OpEditableReplicatedList<SimpleDotPos, string> {
    const factory = SimpleDotBlockFactory.from(replica, seed)
    return linked.OpEditableList(factory, "")
}

function emptyODeltaSeq(
    replica: number,
    seed: string = DEFAULT_SEED
): DeltaEditableReplicatedList<SimpleDotPos, string> {
    return DeltaEditableReplicatedList.from(emptyOpSeq(replica, seed))
}

test([mEmpty] as OpListMacros<SimpleDotPos>, emptyOpSeq, ID)

test(
    [
        mInsertAtRight,
        mInsertAtLeft,
        mInsertAtBoth,
        mInsertAtSplit,
        mInsertAtMultiple,
    ] as OpListMacros<SimpleDotPos>,
    emptyOpSeq,
    ID
)

test(
    [
        mInsertSingle,
        mInsertReplayed,
        mInsertAppend,
        mInsertPrepend,
        mInsertSplitting,
        mInsertSplitted,
        mInsertDoublySplitted,
        mInsertAppendSplitted,
        mInsertPrependSplitted,
        mInsertIncluded,
        mInsertIncluding,
        mInsertOverlappingAfter,
        mInsertOverlappingBefore,
        mInsertAfter,
        mInsertBefore,
        mInsertConcurrent,
        mInsertConcurrentAppend,
        mInsertConcurrentPrepend,
    ] as OpListMacros<SimpleDotPos>,
    emptyOpSeq,
    ID
)

test(
    [
        mRemoveAtEqual,
        mRemoveAtEqualMerge,
        mRemoveAtJustAfter,
        mRemoveAtAfter,
        mRemoveAtJustBefore,
        mRemoveAtBefore,
        mRemoveAtIncludedLeftBy,
        mRemoveAtIncludedMiddleBy,
        mRemoveAtIncludedRightBy,
        mRemoveAtIncludingLeft,
        mRemoveAtIncludingMiddle,
        mRemoveAtIncludingRight,
        mRemoveAtMultiple,
    ] as OpListMacros<SimpleDotPos>,
    emptyOpSeq,
    ID
)

test(
    [
        mRemoveNothing,
        mRemoveEqual,
        mRemoveIncludedLeftBy,
        mRemoveIncludedMiddleBy,
        mRemoveIncludedRightBy,
        mRemoveIncludingLeft,
        mRemoveIncludingMiddle,
        mRemoveIncludingRight,
        mRemoveOverlappingLeft,
        mRemoveOverlappingRight,
        mRemoveSplitting,
        mRemoveSplittedBy,
        mRemoveAfterBeforeMerge,
    ] as OpListMacros<SimpleDotPos>,
    emptyOpSeq,
    ID
)

test(
    [
        mInsertertableEqual,
        mInsertertableIncludedLeftBy,
        mInsertertableIncludedMiddleBy,
        mInsertertableIncludedRightBy,
        mInsertertableIncludingLeft,
        mInsertertableIncludingMiddle,
        mInsertertableIncludingRight,
        mInsertertableSplittedBy,
        mInsertertableSplitting,
        mInsertertableAfterBefore,
        mInsertertableAppednable,
    ] as OpListMacros<SimpleDotPos>,
    emptyOpSeq,
    ID
)

test(
    [
        mApplyDeltaInsertRemove,
        mApplyDeltaPartRemoveInsert,
        mApplyDeltaRemoveInsert,
        mApplyDeltaTwice,
    ] as DeltaListMacros<SimpleDotPos>,
    emptyODeltaSeq,
    ID
)

test(
    [mMergeSimple, mMergeIdempotent, mMerge] as DeltaListMacros<SimpleDotPos>,
    emptyODeltaSeq,
    ID
)
