const mongoose = require('mongoose')
const crypto = require('crypto')

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
    maxlength: 256,
  },
  salt: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 256,
  },
  role: {
    type: String,
    enum: roles,
    default: 'user',
  },
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

    let { email, password } = options

    email = email || ''
    email = email.toLowerCase().trim()

    try {
      const user = await this.findOne({ email }).exec()

      if (!user)
        return fn('User not found.')

      crypto.pbkdf2(password, user.salt, 5000, 32, 'sha512', async (err, derivedKey) => {
        if (err)
          return fn('There has been an internal error. Please try again later.')

        let hash = new Buffer(derivedKey).toString('base64')
        if (hash !== user.password)
          return fn('Wrong password. Confirm and try again.')

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
      })
    } catch (e) {
      console.log(e)
      return fn('There has been an internal error. Please try again later.')
    }
  },

  async create (data, fn) {
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
      console.log(salt)
      let derivedKey = crypto.pbkdf2Sync(password, salt, 5000, 32, 'sha512')

      console.log('derivedKey', derivedKey)
      let result = await this.create({
        email: email,
        password: new Buffer(derivedKey).toString('base64'),
        salt: salt,
        //reg_date: new Date()
      }).exec()

      console.log(result)

      return fn(null, {
        id: result.ops[0]._id,
        email: result.ops[0].email,
      })
    } catch (e) {
      console.log(e)
      return fn('There has been an internal error. Please try again later.')
    }
  }
}

/**
 * @typedef User
 */
module.exports = mongoose.model('Users', userSchema)
