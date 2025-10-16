#!/usr/bin/env bash
set -e

# clean from any previous runs
rm -rf @cotar cotar-core-*.tgz

# clone and checkout desired revision
commit=50eff7712947be256a15079e195503e136df75b6
git init @cotar
cd @cotar
git config advice.detachedHead false
git fetch --depth 1 https://github.com/linz/cotar.git $commit
git checkout FETCH_HEAD

# install and build
npm i
npm run build

# pack subpackage
cd packages/core
current_version=$(npm pkg get version --workspace @cotar/core | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
new_version="$current_version+$(git rev-parse --short HEAD)"
npm version "$new_version" --no-git-tag-version --allow-same-version
npm pack --pack-destination ../../

# install tarball in main project
cd ../../
tgz=$(ls cotar-core-*.tgz | head -n 1)
mv "$tgz" "core@$new_version.tgz"
cd ../
npm install "./@cotar/core@$new_version.tgz"

# clean up
rm -rf @cotar
