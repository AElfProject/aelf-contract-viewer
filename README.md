# aelf-contract-viewer an aelf contract code viewer


![Yarn](https://img.shields.io/badge/yarn-workspace-brightgreen)

-Supported by `yarn workspace` and `lerna`-

## yarn workspace

Use `yarn workspace` to manage mono-repo, including dependencies, scripts.

For running npm scripts:
```shell script
yarn workspace <package-name> run <script-name>
```

## lerna

We use `lerna` to update versions of packages. For every deploying, you need to run `lerna version` to update packages' versions.
