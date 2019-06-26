
# Release

This project follows the [conventional commit convention][ccc] and adheres to [semver][semver].

This enables to automatically generate the changelog and to automaticcaly choose the right version numbers.

To release the librray you can choose any compatible tools.
[Standard Version][stdver] is a compatible one.

## Using Standard Version

Install Standard Version:

```sh
npm i -g standard-version
```

Test the release in dry mode:

```sh
npm run release -- --dry-run
```

Make the release:

```sh
npm run release
```

Push the tag:

```sh
git push --follow-tags origin master
```

and publish on npm:

```sh
npm publish
```

[ccc]: https://www.conventionalcommits.org
[semver]: https://semver.org
[stdver]: https://github.com/conventional-changelog/standard-version