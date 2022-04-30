#!/usr/bin/env bash

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

echo Bumping version...
npm version $ACTUAL -m 'version bump'
echo Building artifacts...
npm run build
npm run build:min
echo Pushing to origin...
# git push
# git push --tags
echo Publishing to NPM
npm publish --dry-run
echo Done!
