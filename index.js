'use strict'

const LIMIT = 20 // default page size

class BasePaginator {
  constructor (fun, opts) {
    this.fun = fun
    this.lastopts = []
    this.limit = opts.limit || LIMIT
    this._hasNextPage = true // assume there is at least one page
  }

  get hasPrevPage () {
    return !!this.lastopts.length
  }

  get hasNextPage () {
    return !!this._hasNextPage
  }

  getOpts (opts) {
    return { limit: this.limit, ...opts }
  }

  async getSamePage () {
    const opts = this.lastopts[this.lastopts.length - 1]
    const page = await this.fun(opts)
    return page
  }

  // getPrevPage is NOT implemented by the base! it MUST be implemented by subclasses

  async getNextPage () {
    const opts = this.getOpts()
    const page = await this.fun(opts)
    this.lastopts.push(opts)
    return page
  }

  async * pages () {
    do {
      yield this.getNextPage()
    } while (this.hasNextPage)
  }

  async * reverse () {
    do {
      yield this.getPrevPage()
    } while (this.hasPrevPage)
  }
}

class ViewPaginator extends BasePaginator {
  constructor (fun, opts) {
    super(fun, opts)
    this.startkey = opts.startkey
    this.finalkey = opts.endkey
    this.skip = opts.skip
  }

  getOpts () {
    const opts = super.getOpts()
    if (!opts.startkey && this.startkey) opts.startkey = this.startkey
    if (this.finalkey) opts.endkey = this.finalkey
    if (this.skip) opts.skip = this.skip
    return opts
  }

  async getPrevPage () {
    const opts = this.lastopts.pop()
    this.startkey = opts.endkey
    const page = await this.fun(opts)
    return page
  }

  async getNextPage () {
    const page = await super.getNextPage()
    if (page.rows.length === 0) {
      // tell the paginator there are no more results in this direction
      this._hasNextPage = false
    } else {
      this.startkey = page.rows[page.rows.length - 1].key
      if (this.startkey === page.rows[0].key) {
        // cannot iterate using keys alone because startkey === endkey
        if (this.skip) {
          this.skip += this.limit
        } else {
          this.skip = this.limit
        }
      } else {
        // set up the query for the next page
        this._hasNextPage = (page.rows.length === this.limit)
        this.skip = page.rows.map(row => row.key).reduce((sum, key) => {
          // adjust skip to account for all rows with a key === this.startkey
          sum += key === this.startkey
          return sum
        }, 0)
      }
    }
    return page
  }
}

class MangoPaginator extends BasePaginator {
  constructor (fun, opts = {}) {
    super(fun, opts)
    this.bookmark = opts.bookmark
  }

  getOpts () {
    const opts = super.getOpts()
    if (this.bookmark) opts.bookmark = this.bookmark
    return opts
  }

  async getPrevPage () {
    const opts = this.lastopts.pop()
    this.bookmark = opts.bookmark
    const page = await this.fun(opts)
    return page
  }

  async getNextPage () {
    const results = await super.getNextPage()
    if (results.docs.length === 0) {
      this._hasNextPage = false
    } else {
      this.bookmark = results.bookmark
    }
    return results
  }
}

module.exports = function (PouchDB) {
  let allDocs
  const query = PouchDB.prototype.query
  const find = PouchDB.prototype.find

  PouchDB.prototype.paginateAllDocs = function () {
    allDocs = this.allDocs
    this.allDocs = function paginatedAllDocs (opts = {}) {
      if (opts.paginate === false) {
        delete opts.paginate
        return allDocs.call(this, opts)
      }
      const allDocsFun = async (subOpts) => {
        return allDocs.call(this, { ...opts, ...subOpts })
      }
      return new ViewPaginator(allDocsFun, opts)
    }
  }

  PouchDB.prototype.paginateQuery = function () {
    this.query = function paginatedQuery (name, opts = {}) {
      if (opts.paginate === false) {
        delete opts.paginate
        return query.apply(this, arguments)
      }
      const queryFun = async (subOpts) => {
        return query.call(this, name, { ...opts, ...subOpts })
      }
      return new ViewPaginator(queryFun, opts)
    }
  }

  PouchDB.prototype.paginateFind = function () {
    if (this.find) {
      this.find = function paginatedFind (opts) {
        if (opts.paginate === false) {
          delete opts.paginate
          return find.apply(this, arguments)
        }
        const findFun = async (subOpts) => {
          return find.call(this, { ...opts, ...subOpts })
        }
        return new MangoPaginator(findFun)
      }
    }
  }

  PouchDB.prototype.paginate = function () {
    this.paginateAllDocs()
    this.paginateQuery()
    this.paginateFind()
  }

  PouchDB.unpaginate = function () {
    if (allDocs) {
      this.prototype.allDocs = allDocs
      allDocs = undefined
    }
    this.prototype.query = query
    this.prototype.find = find
  }
}
