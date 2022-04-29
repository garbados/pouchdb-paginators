/* global describe, it, beforeEach, afterEach, emit */
'use strict'

const assert = require('assert').strict
const { name } = require('./package.json')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))
PouchDB.plugin(require('.'))

const NUM_DOCS = 1e2

describe(name, function () {
  beforeEach(async function () {
    this.db = new PouchDB('.test')
    for (let i = 0; i < NUM_DOCS; i++) {
      if (i % 2 === 0) {
        await this.db.post({ hello: 'world' })
      } else {
        await this.db.post({ hello: 'galaxy' })
      }
    }
  })

  afterEach(async function () {
    await this.db.destroy()
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
