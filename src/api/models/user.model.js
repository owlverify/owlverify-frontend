const mongoose = require('mongoose')
const crypto = require('crypto')

const Recover = require('./recover.model')
const File = require('./file.model')

/**
 * User Roles
 */
const roles = ['user', 'admin']

/**
 * User Schema
 * @private
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    match: /^\S+@\S+\.\S+$/,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 512,
  },
  salt: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 512,
  },
  role: {
    type: String,
    enum: roles,
    default: 'user',
  },
  credits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

/**
 * Statics
 */
userSchema.statics = {
  roles,

  /**
   * Login User
   */
  async sessionLogin (options, fn) {
    if (!options)
      return fn('No data provided.')

    let { email } = options

    email = email || ''
    email = email.toLowerCase().trim()

    try {
      let user = await this.findOne({ email }).exec()

      if (!user)
        user = await (new User({
          email: email,
          //reg_date: new Date()
        })).save()

      let json = {
        id: user._id,
        email: user.email,
        //reg_date: doc.reg_date
      }

      /*
      if (user.payid)
        json.payid = user.payid

      // Update last login
      //await this.update({ email: email }, { $set: { ll: new Date() } }).exec()
      */
      return fn(null, json)

    } catch (e) {
      console.log(e)
      return fn('There has been an internal error. Please try again later.')
    }
  },

  async createUser (data, fn) {
    if (!data)
      return fn('No data provided')

    let email = data.email || ''
    let password = data.password || ''

    email = email.toLowerCase().trim()
    if (!/^\S+@\S+$/.test(email))
      return fn('Email invalid. Confirm and try again')
    if (password.length < 6)
      return fn('Password should have at least six characters')

    try {
      let user = await this.findOne({ email }).exec()

      if (user)
        return fn('This email is already in use.')

      let salt = crypto.randomBytes(128).toString('base64')
      let derivedKey = crypto.pbkdf2Sync(password, salt, 5000, 32, 'sha512')

      let result = await (new User({
        email: email,
        password: Buffer.from(derivedKey).toString('base64'),
        salt: salt,
        //reg_date: new Date()
      })).save()

      return fn(null, {
        id: result._id,
        email: result.email,
      })
    } catch (e) {
      console.log(e)
      return fn('There has been an internal error. Please try again later.')
    }
  },

  async dashboardData (user, fn) {
    let data = {
      totalFiles: 0,
      credits: 0,
      files: []
    }

    try {
      data.credits = (await this.findById(user.id).exec()).credits

      data.totalFiles = await File.countDocuments({
        ownerId: user.id
      })

      data.files = await File.find({
        ownerId: user.id
      }, null, {
        limit: 10,
        sort: {
          updatedAt: -1
        }
      })
        .exec()

    } catch (e) {
      console.log(e)
    } finally {
      return fn(null, data)
    }
  }
}

const User = mongoose.model('Users', userSchema)

/**
 * @typedef User
 */
module.exports = User
