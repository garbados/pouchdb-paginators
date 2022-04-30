/* global describe, it, beforeEach, afterEach, emit */
'use strict'

// require regenerator runtime for babelify-envify-mochify pipeline
try {
  window && require('regenerator-runtime')
} catch (err) {
  // ignore
}

const assert = require('assert').strict
const { name } = require('./package.json')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))
PouchDB.plugin(require('.'))

const NUM_DOCS = 1e2

const POUCH_PATH = process.env.COUCH_URL
  ? `${process.env.COUCH_URL}/pouchdb-paginators-test`
  : '.test'

describe(name, function () {
  this.timeout(10 * 1000) // ci takes a while, huh?

  beforeEach(async function () {
    this.db = new PouchDB(POUCH_PATH)
    this.db.paginate()
    const docs = []
    for (let i = 0; i < NUM_DOCS; i++) {
      if (i % 2 === 0) {
        docs.push({ hello: 'world' })
      } else {
        docs.push({ hello: 'galaxy' })
      }
    }
    await this.db.bulkDocs({ docs })
  })

  afterEach(async function () {
    await this.db.destroy()
    PouchDB.unpaginate()
  })

  describe('initialization', function () {
    it('should not modify find if it does not exist', async function () {
      PouchDB.unpaginate()
      this.db.find = undefined
      this.db.paginate()
      assert.equal(typeof this.db.find, 'undefined')
    })

    it('should unpaginate ok multiple times', function () {
      PouchDB.unpaginate()
      PouchDB.unpaginate()
    })
  })

  describe('allDocs', function () {
    it('should paginate ok', async function () {
      const pager = this.db.allDocs()
      // test forward pagination
      const ids = {}
      let total = 0
      for await (const page of pager.pages()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates during paging
          assert(!(row.id in ids), 'encountered duplicate id while paging forward')
          ids[row.id] = true
        }
      }
      assert.equal(pager.hasNextPage, false, 'did not page through all pages')
      assert.equal(total, NUM_DOCS, 'did not page through all docs')
      // test reverse pagination
      total = 0
      for await (const page of pager.reverse()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates while paging backwards
          assert(row.id in ids, 'encountered duplicate id while paging backward')
          delete ids[row.id]
        }
      }
      assert.equal(pager.hasPrevPage, false, 'did not page through all pages while paging backwards')
      assert.equal(total, NUM_DOCS, 'did not page through all docs while paging backwards')
    })

    it('should not paginate when asked', async function () {
      const results = await this.db.allDocs({ paginate: false })
      assert.equal(results.rows.length, NUM_DOCS)
    })
  })

  describe('query', function () {
    beforeEach(async function () {
      await this.db.put({
        _id: '_design/queries',
        views: {
          test: {
            map: function (doc) {
              emit(doc.hello)
            }.toString()
          },
          list: {
            map: function (doc) {
              emit([doc.hello, doc._id])
            }.toString()
          }
        }
      })
    })

    it('should paginate through results', async function () {
      const pager = this.db.query('queries/test')
      // test forward pagination
      const ids = {}
      let total = 0
      for await (const page of pager.pages()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates during paging
          assert(!(row.id in ids), 'encountered duplicate id while paging forward')
          ids[row.id] = true
        }
      }
      assert.equal(pager.hasNextPage, false, 'did not page through all pages')
      assert.equal(total, NUM_DOCS, 'did not page through all docs')
      // test reverse pagination
      total = 0
      for await (const page of pager.reverse()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates while paging backwards
          assert(row.id in ids, 'encountered duplicate id while paging backward')
          delete ids[row.id]
        }
      }
      assert.equal(pager.hasPrevPage, false, 'did not page through all pages while paging backwards')
      assert.equal(total, NUM_DOCS, 'did not page through all docs while paging backwards')
    })

    it('should handle endkeys ok', async function () {
      const pager = this.db.query('queries/test', {
        startkey: 'galaxz',
        endkey: 'world'
      })
      const ids = {}
      let total = 0
      for await (const page of pager.pages()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates during paging
          assert(!(row.id in ids), 'encountered duplicate id while paging forward')
          ids[row.id] = true
        }
      }
      assert.equal(pager.hasNextPage, false, 'did not page through all pages')
      assert.equal(total, Math.floor(NUM_DOCS / 2), 'did not page through all docs')
      // test reverse pagination
      total = 0
      for await (const page of pager.reverse()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates while paging backwards
          assert(row.id in ids, 'encountered duplicate id while paging backward')
          delete ids[row.id]
        }
      }
      assert.equal(pager.hasPrevPage, false, 'did not page through all pages while paging backwards')
      assert.equal(total, Math.floor(NUM_DOCS / 2), 'did not page through all docs while paging backwards')
    })

    it('should handle array keys ok', async function () {
      const pager = this.db.query('queries/list')
      // test forward pagination
      const ids = {}
      let total = 0
      for await (const page of pager.pages()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates during paging
          assert(!(row.id in ids), 'encountered duplicate id while paging forward')
          ids[row.id] = true
        }
      }
      assert.equal(pager.hasNextPage, false, 'did not page through all pages')
      assert.equal(total, NUM_DOCS, 'did not page through all docs')
      // test reverse pagination
      total = 0
      for await (const page of pager.reverse()) {
        assert.equal(typeof page.rows.length, 'number', 'results did not resemble normal query results')
        total += page.rows.length
        for (const row of page.rows) {
          // ensure we never encounter duplicates while paging backwards
          assert(row.id in ids, 'encountered duplicate id while paging backward')
          delete ids[row.id]
        }
      }
      assert.equal(pager.hasPrevPage, false, 'did not page through all pages while paging backwards')
      assert.equal(total, NUM_DOCS, 'did not page through all docs while paging backwards')
    })

    it('should get the same page ok', async function () {
      const pager = this.db.query('queries/test')
      const page1 = await pager.getNextPage()
      const page2 = await pager.getSamePage()
      for (let i = 0; i < page1.rows.length; i++) {
        const row1 = page1.rows[i]
        const row2 = page2.rows[i]
        assert.equal(row1.id, row2.id, 'getting the same page again returned unexpected results')
      }
    })

    it('should not paginate when asked', async function () {
      const results = await this.db.query('queries/test', { paginate: false })
      assert.equal(results.rows.length, NUM_DOCS)
    })
  })

  describe('find', function () {
    beforeEach(async function () {
      await this.db.createIndex({
        index: { fields: ['hello'] }
      })
    })

    it('should page through results ok', async function () {
      const pager = this.db.find({ selector: { hello: 'world' } })
      const ids = {}
      let total = 0
      for await (const page of pager.pages()) {
        assert.equal(typeof page.docs.length, 'number', 'results did not resemble normal query results')
        total += page.docs.length
        for (const doc of page.docs) {
          // ensure we never encounter duplicates during paging
          assert(!(doc._id in ids), 'encountered duplicate id while paging forward')
          ids[doc._id] = true
        }
      }
      assert.equal(pager.hasNextPage, false, 'did not page through all pages')
      assert.equal(total, Math.floor(NUM_DOCS / 2), 'did not page through all docs')
      // test reverse pagination
      total = 0
      for await (const page of pager.reverse()) {
        assert.equal(typeof page.docs.length, 'number', 'results did not resemble normal query results')
        total += page.docs.length
        for (const doc of page.docs) {
          // ensure we never encounter duplicates while paging backwards
          assert(doc._id in ids, 'encountered duplicate id while paging backward')
          delete ids[doc._id]
        }
      }
      assert.equal(pager.hasPrevPage, false, 'did not page through all pages while paging backwards')
      assert.equal(total, Math.floor(NUM_DOCS / 2), 'did not page through all docs while paging backwards')
    })

    it('should not paginate when asked', async function () {
      const results = await this.db.find({ selector: { hello: 'world' }, paginate: false })
      assert('docs' in results)
    })
  })
})
