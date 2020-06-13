const mongoose = require('mongoose')

/**
 * File Status
 */
const status = ['pending', 'uploaded', 'verified', 'processing']

/**
 * File Schema
 * @private
 */
const fileSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectID,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: status,
    default: 'pending',
  },
}, {
  timestamps: true
})

fileSchema.statics = {
  getAll (account, options, fn) {
    if (!account)
      return fn('Account not specified')

    options = options || {}
    let limit = options.limit || 20
    let skip = options.offset || 0
    let sort = 'updated_at',
      order = -1,
      allowedSort = ['name', 'updated_at', 'status']

    if (options.sort && allowedSort.indexOf(options.sort) !== -1)
      sort = options.sort
    if (options.dir && options.dir === 'asc')
      order = 1

    let qs = {
      limit,
      skip: parseInt(skip),
      sort: {}
    }
    qs.sort[sort] = order

    let p = new Promise((resolve, reject) => {
      this.countDocuments({
        ownerId: account.id
      }, (err, c) => {
        if (err)
          return reject(err)

        resolve(c)
      })
    }).then(total => {
      this.find({
        ownerId: account.id
      }, qs).toArray((err, docs) => {
        if (err) {
          console.log(err)
          return fn('Internal Error')
        }

        fn(null, {
          total: total,
          count: docs.length,
          offset: skip,
          limit,
          files: docs
        })
      })
    }).catch(err => {
      fn(err)
    })
  }
}

/**
 * @typedef File
 */
module.exports = mongoose.model('Files', fileSchema)
