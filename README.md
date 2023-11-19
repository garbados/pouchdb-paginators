# PouchDB-Paginators

[![CI](https://github.com/garbados/pouchdb-paginators/actions/workflows/ci.yaml/badge.svg)](https://github.com/garbados/pouchdb-paginators/actions/workflows/ci.yaml)
[![Coverage Status](https://img.shields.io/coveralls/github/garbados/pouchdb-paginators/master.svg?style=flat-square)](https://coveralls.io/github/garbados/pouchdb-paginators?branch=master)
[![Stability](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![NPM Version](https://img.shields.io/npm/v/pouchdb-paginators.svg?style=flat-square)](https://www.npmjs.com/package/pouchdb-paginators)
[![JS Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

A plugin that adds to PouchDB methods like `.paginateAllDocs()` which return paginators over results. Paginators can be iterated over without loading all results into memory, and they effectively coordinate per-page query settings with usual options like `reduce: false` or `include_docs: true`.

Pagination in PouchDB and CouchDB is rather unintuitive, especially for map/reduce views. This plugin intends to make it easy and reliable. For example:

```js
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-paginators'))

const db = new PouchDB('...')

const pager = db.paginateQuery('queries/example')
// now you can page through results
for await (const results of pager.pages()) {
  // do what thou wilt
}
// and you can even page backwards
for await (const results of pager.reverses()) {
  // do what thou wilt, but with feeling this time!
}
```

## Compatibility Note

Pagination using `db.find()` only works with a PouchDB instance representing a connection to a CouchDB installation. Otherwise, because [PouchDB does not currently support bookmarks](https://github.com/pouchdb/pouchdb/issues/8497), your paginators will always return the same page. If you are using PouchDB with any non-CouchDB storage backend, like leveldb or indexeddb, `.paginateFind()` will not be able to page forward.

## Usage

### New Methods

The plugin adds three methods which mirror existing query methods, accepting all the same options, but which return paginators:

- `db.paginateAllDocs()` mirrors `db.allDocs()`.
- `db.paginateQuery()` mirrors `db.query()`.
- `db.paginateFind()` mirrors `db.find()`.

### Paginator

All paginators have the same API. The pages that paginators return have a default limit of 20 results.

#### paginator.hasPrevPage

A getter that returns a boolean indicating whether the paginator has a previous page.

#### paginator.hasNextPage

A getter that returns a boolean indicating whether the paginator has a next page. This is optimistically set to `true` when the paginator is first created.

#### async paginator.getNextPage()

Returns the next page of results, as though you had called the query or find method itself.

#### async paginator.getPrevPage()

Returns the previous page of results, as though you had called the query or find method itself.

#### async paginator.getSamePage()

Returns the same page of results as the last method that returned a page, as though you had called the query or find method itself.

#### async * paginator.pages()

Returns an iterator that allows you to use a for-loop to loop through pages of results.

```js
for await (const results of pager.pages()) {
  // do what thou wilt
}
```

#### async * paginator.reverse()

Returns an iterator that allows you to use a for-loop to loop through pages of results in reverse.

```js
for await (const results of pager.reverse()) {
  // do what thou wilt, in reverse!
}
```

## Development

If you encounter a bug or would like to request a feature, please [file an issue](https://github.com/garbados/pouchdb-paginators/issues)!

*If you are submitting a patch, please be a good neighbor and include tests!*

To hack on this project locally, first get its source and install its dependencies:

```bash
$ git clone git@github.com:garbados/pouchdb-paginators.git
$ cd pouchdb-paginators
$ npm i
```

Then you can run the test suite:

```bash
$ npm test
```

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
