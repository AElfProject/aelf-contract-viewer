# aelf-contract-viewer an aelf contract code viewer


![Yarn](https://img.shields.io/badge/yarn-workspace-brightgreen)

-Supported by `yarn workspace` and `lerna`-

## yarn workspace

Use `yarn workspace` to manage mono-repo, including dependencies, scripts.

For running npm scripts:
```shell script
yarn workspace <package-name> run <script-name>
```

### workspace ```Viewer```

We set two env in package.json

```shell
RELOAD_ENV=false # as iframe in explore project, equal `reload`.
NODE_ENV=development
```

## lerna

We use `lerna` to update versions of packages. For every deploying, you need to run `lerna version  --conventional-commits` to update packages' versions.
