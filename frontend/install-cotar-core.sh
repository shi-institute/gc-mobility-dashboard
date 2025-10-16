#!/usr/bin/env bash
set -e

# clean from any previous runs
rm -rf tmp_cotar cotar-core-*.tgz

# clone and checkout desired revision
git clone https://github.com/linz/cotar.git tmp_cotar
cd tmp_cotar
git checkout 50eff7712947be256a15079e195503e136df75b6

# install and build
npm i
npm run build

# pack subpackage
cd packages/core
npm pack --pack-destination ../../

# install tarball in main project
cd ../../
tgz=$(ls cotar-core-*.tgz | head -n 1)
npm install "./$tgz"

# clean up
cd ../
rm -rf tmp_cotar "$tgz"
