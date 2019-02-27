import test from "ava"

import {
    mEmpty,
    mInsertAtRight,
    mInsertAtLeft,
    mInsertAtSplit,
    ListMacros,
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
    mApplyDeltaInsertRemove,
    mApplyDeltaPartRemoveInsert,
    mApplyDeltaRemoveInsert,
    mApplyDeltaTwice,
    mMerge,
    mMergeSimple,
    mMergeIdempotent,
} from "../macro"
import { SimpleBlockFactory, SimplePos } from "../../../src"
import { EditableOpReplicatedList } from "../../../src/core/op-replicated-list"
import { EditableOpAvlList } from "../../../src/list/avl/op-avl-list"

const DEFAULT_SEED = "dotted-logootsplit"

const ID = "mut-avl"

function emptySeq(
    replica: number,
    seed: string = DEFAULT_SEED
): EditableOpReplicatedList<SimplePos, string> {
    const factory = SimpleBlockFactory.from(replica, seed)
    return EditableOpAvlList.emptyWith(factory, "")
}

test([mEmpty] as ListMacros<SimplePos>, emptySeq, ID)

test(
    [
        mInsertAtRight,
        mInsertAtLeft,
        mInsertAtBoth,
        mInsertAtSplit,
        mInsertAtMultiple,
    ] as ListMacros<SimplePos>,
    emptySeq,
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
    ] as ListMacros<SimplePos>,
    emptySeq,
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
    ] as ListMacros<SimplePos>,
    emptySeq,
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
    ] as ListMacros<SimplePos>,
    emptySeq,
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
    ] as ListMacros<SimplePos>,
    emptySeq,
    ID
)

test(
    [
        mApplyDeltaInsertRemove,
        mApplyDeltaPartRemoveInsert,
        mApplyDeltaRemoveInsert,
        mApplyDeltaTwice,
    ] as ListMacros<SimplePos>,
    emptySeq,
    ID
)

test(
    [mMergeSimple, mMergeIdempotent, mMerge] as ListMacros<SimplePos>,
    emptySeq,
    ID
)
