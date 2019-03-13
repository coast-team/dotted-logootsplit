# Dotted LogootSplit: A delta block-wise sequence CRDT

[![travis][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

A [CRDT][crdt] is a data structure which can be replicated over multiple devices and thus concurrently edited.
Most of the CRDT embeds metadata in order to avoid conflicting edits.
The challenge is to keep these metadata as small as possible.

LogootSplit [[1]](#ref-1) is a sequence CRDT which reduces the metadata of preceding sequence CRDT; to do so it aggregates elements.

LogootSplit is an operation-based CRDT. Hence, it is necessary to use a network layer to deliver exactly-once the operations.
It requires also to deliver removals after insertions. In practice, this is difficult to implement.

Delta-based CRDT [[2]](#ref-2) have less assumptions. Most of delta-based CRDT simply assume a FIFO delivery (deltas from a same replica, are merged in-order).
They also enable to merge two states. This is particularly interesting for intensive collaborative sessions with long periods of disconnection.

Dotted LogootSplit offers a delta-based version of LogootSplit with smaller metadata.
We provide both op-based and delta-based synchronizations.

## Publication

Coming soon...

## References

[1]<a id="ref-1"> Luc André, Stéphane Martin, Gérald Oster, Claudia-Lavinia
Ignat. **Supporting Adaptable Granularity of Changes for Massive-scale
Collaborative Editing**. In _Proceedings of the international conference on
collaborative computing: networking, applications and worksharing -
CollaborateCom 2013_. IEEE Computer Society, october 2013, pages 50–59.
[hal-00903813](https://hal.inria.fr/hal-00903813/)

[2]<a id="ref-2"> Paulo Sérgio Almeida,, Ali Shoker,
Carlos Baquero. **Delta State Replicated Data Types**, Journal of Parallel and
Distributed Computing, Volume 111, January 2018, Pages 162-173.
[arXiv:1603.01529](https://arxiv.org/pdf/1603.01529.pdf)

## Usage

```
npm install dotted-logootsplit
```

The following example craetes two replicas and uses delta-based synchornozations.

```ts
import { avl, SimpleDotBlockFactory } from "dotted-logootsplit"

const seed = "dotted-logootsplit" // for reproducibility

const replicaA = 0
const strategyA = SimpleBlockFactory.from(replicaA, seed)
const stateA = avl.deltaEditableList(strategyA, "")

const replicaB = 1
const strategyB = SimpleBlockFactory.from(replicaB, seed)
const stateB = avl.deltaEditableList(strategyB, "")

const deltaA1 = stateA.insertAt(0, "Helo  ")
const deltaA2 = stateA.insertAt(6, "world!")
console.log(stateA.concatenated(""))
// A: "Helo  world!"

// delta sync
stateB.applyDelta(deltaA1)
console.log(stateB.concatenated(""))
// B: "Helo  "

const deltaB1 = stateB.insertAt(2, "l")
console.log(stateB.concatenated(""))
// B: "Hello  "

stateB.applyDelta(deltaA2)
console.log(stateB.concatenated(""))
// B: "Hello  world!"

const deltasB2 = stateB.removeAt(5, 1) // remove a space
console.log(stateB.concatenated(""))
// B: "Hello world!"

stateA.applyDelta(deltaB1)
for (const d of deltasB2) {
    stateA.applyDelta(d)
}
console.log(stateA.concatenated(""))
// A: "Hello world!"
```

## TODO

-   [x] Local editing
-   [x] Op-based sync
-   [x] causal delta-based sync
-   [ ] Out-of-order delta-based sync (WIP)
-   [x] state-based sync (state merging)
-   [ ] Anchors (a participant cursor is an anchor)
-   [ ] LSeq-like positions and generation strategies
-   [ ] Simpler balanced tree implementation

[crdt]: https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type
[travis-image]: https://travis-ci.org/coast-team/dotted-logootsplit.svg
[travis-url]: https://travis-ci.org/coast-team/dotted-logootsplit
[npm-image]: https://img.shields.io/npm/v/dotted-logootsplit.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/dotted-logootsplit
