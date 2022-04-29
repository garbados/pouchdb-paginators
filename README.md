# PouchDB-Paginators

[![CI](https://github.com/garbados/pouchdb-paginators/actions/workflows/ci.yaml/badge.svg)](https://github.com/garbados/pouchdb-paginators/actions/workflows/ci.yaml)
[![Coverage Status](https://img.shields.io/coveralls/github/garbados/pouchdb-paginators/master.svg?style=flat-square)](https://coveralls.io/github/garbados/pouchdb-paginators?branch=master)
[![Stability](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![NPM Version](https://img.shields.io/npm/v/pouchdb-paginators.svg?style=flat-square)](https://www.npmjs.com/package/pouchdb-paginators)
[![JS Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

A plugin that causes the `db.query()` and `db.find()` methods to return paginators instead of promises, allowing you to page through large result sets confidently.

Pagination in PouchDB and CouchDB is rather unintuitive, especially for map/reduce views. This plugin intends to make it easy and reliable. For example:

```js
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-paginators'))

const db = new PouchDB('...')
db.paginate() // setup paginators

const pager = db.query('queries/example')
// now you can page through results
for await (const results of pager.pages()) {
  // do what thou wilt
}
// and you can even page backwards
for await (const results of pager.reverses()) {
  // do what thou wilt, but with feeling this time!
}
```

You can disable pagination if you prefer:

```js
const results = await db.query('queries/example', { paginate: false })
console.log(results)
// {
//   total_rows: N,
//   rows: [
//     ...
//   ]
// }
```

You can even turn off pagination globally.

```js
PouchDB.unpaginate()
const results = await db.query('queries/example')
console.log(results)
// {
//   total_rows: N,
//   rows: [
//     ...
//   ]
// }
```

## Usage

### PouchDB.unpaginate()

Removes the paginating methods from PouchDB instances and restores them to their non-paginating originals.

### db.paginate()

Sets up pagination. Until this is run, query and find methods will not return paginators.

### db.query(name, opts)

Unless `opt.paginate` is equal to `false`, this method will now return a paginator. If it is true, this method will return results normally.

### db.find(opts)

If you have set up Mango queries with [pouchdb-find](https://pouchdb.com/guides/mango-queries.html), then adding this plugin will cause the `db.find()` method to return a paginator. You may disable pagination and return normal results by setting `opts.paginate` to false.

### Paginator

Paginators for both `db.query()` and `db.find()` have the same API. The pages that paginators return have a default limit of 20 results.

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
