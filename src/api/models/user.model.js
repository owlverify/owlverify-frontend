const mongoose = require('mongoose');
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
    maxlength: 128,
  },
  salt: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 128,
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
  async sessionLogin (options) {
    if (!options)
      return fn('No data provided.')

    let { email, password } = options

    email = email || ''
    email = email.toLowerCase().trim()

    try {
      const user = await this.findOne({ email }).exec()

      if (!user)
        return fn('User not found.')

      crypto.pbkdf2(password, doc.salt, 5000, 32, 'sha512', async (err, derivedKey) => {
        if (err)
          return fn('There has been an internal error. Please try again later.')

        let hash = new Buffer(derivedKey).toString('base64')
        if (hash !== doc.password)
          return fn('Wrong password. Confirm and try again.')

        let json = {
          id: doc._id,
          email: doc.email,
          //reg_date: doc.reg_date
        }

        /*
        if (doc.payid)
          json.payid = doc.payid

        // Update last login
        //await this.update({ email: email }, { $set: { ll: new Date() } }).exec()
        */
        return fn(null, json)
      })
    } catch (e) {
      return fn('There has been an internal error. Please try again later.')
    }
  }
}

/**
 * @typedef User
 */
module.exports = mongoose.model('Users', userSchema)
