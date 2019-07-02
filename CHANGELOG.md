# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.3.0](https://github.com/coast-team/dotted-logootsplit/compare/v0.2.1...v0.3.0) (2019-07-02)


### Bug Fixes

* weaken stronger assertions ([0369943](https://github.com/coast-team/dotted-logootsplit/commit/0369943))


### Features

* add generated replica id for all pos ([4270639](https://github.com/coast-team/dotted-logootsplit/commit/4270639))



### [0.2.1](https://github.com/coast-team/dotted-logootsplit/compare/v0.2.0...v0.2.1) (2019-06-06)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/coast-team/dotted-logootsplit/compare/v0.1.0...v0.2.0) (2019-04-04)


### Bug Fixes

* allow tree balancing ([4420be5](https://github.com/coast-team/dotted-logootsplit/commit/4420be5))


### Features

* add anchor ([c610fb6](https://github.com/coast-team/dotted-logootsplit/commit/c610fb6))
* provide original LogootSplit pos ([313a860](https://github.com/coast-team/dotted-logootsplit/commit/313a860))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/coast-team/dotted-logootsplit/compare/v0.0.2...v0.1.0) (2019-03-13)


### Bug Fixes

* fix hasAPenndable / hasPrependable ([f47a41c](https://github.com/coast-team/dotted-logootsplit/commit/f47a41c))


### Features

* add AVL list impl ([f4d44a6](https://github.com/coast-team/dotted-logootsplit/commit/f4d44a6))
* add dot-pos abstraction ([86139b7](https://github.com/coast-team/dotted-logootsplit/commit/86139b7))
* add factories for AVL and linked list ([5da84cb](https://github.com/coast-team/dotted-logootsplit/commit/5da84cb))
* add fromPlain factories ([e9304a7](https://github.com/coast-team/dotted-logootsplit/commit/e9304a7))
* add garbage collector facility for block factories ([907de61](https://github.com/coast-team/dotted-logootsplit/commit/907de61))
* add op/delta replicated list ([51272d5](https://github.com/coast-team/dotted-logootsplit/commit/51272d5))
* add original LogootSplit positions ([653566b](https://github.com/coast-team/dotted-logootsplit/commit/653566b))
* assert can now throw errors ([638e0d5](https://github.com/coast-team/dotted-logootsplit/commit/638e0d5))
* reproducible block generation ([5d8a32b](https://github.com/coast-team/dotted-logootsplit/commit/5d8a32b))
* update TypeScript ([f63dcfa](https://github.com/coast-team/dotted-logootsplit/commit/f63dcfa))


### BREAKING CHANGES

* - remove ReadonlyReplicatedList and ReplicatedList
  Use {Op,Delta}ReplicatedList and
  Editable{Op,Delta}ReplicatedList instead.



<a name="0.0.2"></a>
## [0.0.2](https://github.com/coast-team/dotted-logootsplit/compare/v0.0.1...v0.0.2) (2018-05-29)



<a name="0.0.1"></a>
## [0.0.1](https://github.com/coast-team/dotted-logootsplit/compare/v0.0.1-3...v0.0.1) (2018-05-27)


### Bug Fixes

* **type:** export uint32 ([43cc13b](https://github.com/coast-team/dotted-logootsplit/commit/43cc13b))



<a name="0.0.1-3"></a>
## [0.0.1-3](https://github.com/coast-team/dotted-logootsplit/compare/v0.0.1-2...v0.0.1-3) (2018-03-19)



<a name="0.0.1-2"></a>
## [0.0.1-2](https://github.com/Conaclos/dotted-logootsplit/compare/v0.0.1-1...v0.0.1-2) (2018-03-16)



<a name="0.0.1-1"></a>
## [0.0.1-1](https://github.com/Conaclos/dotted-logootsplit/compare/v0.0.1-0...v0.0.1-1) (2018-03-16)


### Bug Fixes

* BlockOrdering enum values ([1e770f7](https://github.com/Conaclos/dotted-logootsplit/commit/1e770f7))
* ensure idempotency when the current replica play its own deltas ([773bc25](https://github.com/Conaclos/dotted-logootsplit/commit/773bc25))



<a name="0.0.1-0"></a>
## 0.0.1-0 (2018-03-15)


### Bug Fixes

* add missing precondition for insertion ([41b283e](https://gitlab.inria.fr/velvinge/dotted-logoot-split/commit/41b283e))
* block comparison ([36aff40](https://gitlab.inria.fr/velvinge/dotted-logoot-split/commit/36aff40))
* fifo context bug ([43875c1](https://gitlab.inria.fr/velvinge/dotted-logoot-split/commit/43875c1))
