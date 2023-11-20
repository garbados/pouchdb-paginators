'use strict'

const LIMIT = 20 // default page size

class BasePaginator {
  constructor (fun, opts) {
    this.fun = fun
    this.lastopts = []
    this.limit = opts.limit || LIMIT
    this._hasPrevPage = false
    this._hasNextPage = true // assume there is at least one page
  }

  get hasPrevPage () {
    return !!this._hasPrevPage
  }

  get hasNextPage () {
    return !!this._hasNextPage
  }

  _mergeOpts (opts) {
    return { limit: this.limit, ...opts }
  }

  getOpts () {
    const opts = this.lastopts[this.lastopts.length - 1] || {}
    return this._mergeOpts(opts)
  }

  async getPrevPage () {
    const opts = this.lastopts.pop()
    const page = await this.fun(opts)
    if (this.lastopts.length === 0) {
      this._hasPrevPage = false
    }
    return page
  }

  async getSamePage () {
    const opts = this.getOpts()
    const page = await this.fun(opts)
    if (this.lastopts.length === 0) {
      // get first page ok
      this.lastopts.push(opts)
    }
    return page
  }

  async getNextPage () {
    const opts = this.getOpts()
    console.log(opts)
    const page = await this.fun(opts)
    this.lastopts.push(opts)
    if (this.lastopts.length > 1) {
      this._hasPrevPage = true
    }
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

  _mergeOpts (opts) {
    opts = super._mergeOpts(opts)
    if (this.startkey) opts.startkey = this.startkey
    if (this.finalkey) opts.endkey = this.finalkey
    if (this.skip) opts.skip = this.skip
    return opts
  }

  async getNextPage () {
    const page = await super.getNextPage()
    if (page.rows.length === 0) {
      // tell the paginator there are no more results in this direction
      this.lastopts.pop()
      this._hasNextPage = false
    } else {
      this.startkey = page.rows[page.rows.length - 1].key
      // set up the query for the next page
      this._hasNextPage = (page.rows.length === this.limit)
      this.skip = page.rows.map(row => row.key).reduce((sum, key) => {
        // adjust skip to account for all rows with a duplicate key
        sum += key === this.startkey ? 1 : 0
        return sum
      }, -1)
    }
    return page
  }
}

class MangoPaginator extends BasePaginator {
  constructor (fun, opts = {}) {
    super(fun, opts)
    this.bookmark = opts.bookmark
  }

  _mergeOpts (opts) {
    opts.bookmark ||= this.bookmark
    return super._mergeOpts(opts)
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

module.exports = {
  paginateAllDocs: function (opts = {}) {
    const allDocsFun = async (subOpts) => {
      return this.allDocs({ ...opts, ...subOpts })
    }
    return new ViewPaginator(allDocsFun, opts)
  },
  paginateQuery: function (name, opts = {}) {
    const queryFun = async (subOpts) => {
      return this.query(name, { ...opts, ...subOpts })
    }
    return new ViewPaginator(queryFun, opts)
  },
  paginateFind: function (opts = {}) {
    const findFun = async (subOpts) => {
      return this.find({ ...opts, ...subOpts })
    }
    return new MangoPaginator(findFun)
  }
}
