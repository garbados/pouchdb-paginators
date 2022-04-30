#!/usr/bin/env bash

# THE RELEASE PROCESS
# to release a new version you must use this process.
# you must possess the privileges it requires.
# you are accountable for its proper execution.
# ARE YOU PREPARED FOR THE CONSEQUENCES?

OPTIONS=("patch" "minor" "major")
DEFAULT=patch
ACTUAL=$1

if [ -z "$ACTUAL" ]; then
  echo No version bump given. Assuming $DEFAULT...
  ACTUAL=$DEFAULT
fi

if [[ ! " ${OPTIONS[*]} " =~ " ${ACTUAL} " ]]; then
    echo "Version bump must be one of ${OPTIONS[@]}"
    exit 1
fi

echo Cleaning directory... && \
git stash && \
git clean -dxf && \
echo Installing dependencies... && \
npm i && \
echo Running tests... && \
npm test && \
echo Bumping version... && \
npm version $ACTUAL -m 'version bump' && \
echo Building artifacts... && \
npm run build && \
npm run build:min && \
echo Pushing to origin... && \
git push && \
git push --tags && \
echo Publishing to NPM && \
npm publish --dry-run && \
echo Done!
