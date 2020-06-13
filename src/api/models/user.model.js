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

        let hash = Buffer.from(derivedKey).toString('base64')
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

  async recoverPassword(data, fn) {

  }
}

const User = mongoose.model('Users', userSchema);

/**
 * @typedef User
 */
module.exports = User
