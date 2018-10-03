
# Dotted LogootSplit: A delta-based sequence CRDT

[![travis][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

A [CRDT][CRDT] is a data structure which can be replicated over multiple devices and thus concurrently edited. Most of the CRDT embeds metadata in order to avoid conflicting edits. The challenge is to keep these metadata as small as possible.

LogootSplit [[1]](#ref-1) is a sequence CRDT which reduces the metadata of preceding sequence CRDT; to do so it aggregates elements.

LogootSplit is an operation-based CRDT. Hence, it is necessary to use a network layer to deliver exactly-once the operations. It requires also to deliver removals after insertions. In practice, this is difficult to implement.

Delta-based CRDT [[2]](#ref-2) have less assumptions. Most of delta-based CRDT simply assume a FIFO delivery (deltas from a same replica, are merged in-order). They also enable to merge two states. This is particularly interesting for intensive collaborative sessions with long periods of disconnection.

Dotted LogootSplit offers a delta-based version of LogootSplit. Furthermore, the generated metadata is smaller. The current implementation is based on a linked list. This is suitable for small lists and strings.

## Publication

Coming soon...

## References

[1]<a id="ref-1"> Luc André, Stéphane Martin, Gérald Oster, Claudia-Lavinia
 Ignat. **Supporting Adaptable Granularity of Changes for Massive-scale
  Collaborative Editing**. In *Proceedings of the international conference on
  collaborative computing: networking, applications and worksharing -
  CollaborateCom 2013*. IEEE Computer Society, october 2013, pages 50–59.
  [hal-00903813](https://hal.inria.fr/hal-00903813/)

[2]<a id="ref-2"> Paulo Sérgio Almeida,, Ali Shoker,
 Carlos Baquero. **Delta State Replicated Data Types**, Journal of Parallel and
 Distributed Computing, Volume 111, January 2018, Pages 162-173.
 [arXiv:1603.01529](https://arxiv.org/pdf/1603.01529.pdf)

## Usage

```
npm install dotted-logootsplit
```

```ts
import {
    ReplicableLinkedList,
    SimpleBlockFactory
} from "dotted-logootsplit"

const replicaA = 0
const strategyA = SimpleBlockFactory.from(replicaA, "app-seed")
const stateA = new ReplicableLinkedList(strategyA, "")

const replicaB = 1
const strategyB = SimpleBlockFactory.from(replicaB, "app-seed")
const stateB = new ReplicableLinkedList(strategyB, "")

const deltaA1 = stateA.insertAt(0, "Helo  ")
const deltaA2 = stateA.insertAt(6, "world!")
console.log(stateA.concatenated(""))
// A: "Helo  world!"

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

- [x] Implement local editing
- [x] Implement delta merging (remote editing)
- [x] Enforce structural convergence
    Regardless the order of integration, two participants which merge the same
    set of delta, must have the same structure.
- [ ] Implement state merging.
- [ ] Implement anchors (a participant cursor is an anchor).
- [ ] Simplify interfaces.
    - Remove Position abstraction?


[CRDT]:
https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type

[travis-image]:
https://travis-ci.org/coast-team/dotted-logootsplit.svg
[travis-url]: https://travis-ci.org/coast-team/dotted-logootsplit
[npm-image]:
https://img.shields.io/npm/v/dotted-logootsplit.svg?style=flat-square
[npm-url]:
https://www.npmjs.com/package/dotted-logootsplit
