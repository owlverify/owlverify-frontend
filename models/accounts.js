const dbo = require('../lib/db')
const crypto = require('crypto')
const request = require('request')
const moment = request('moment')

exports.create = (data, fn) => {
  if (!data)
    return fn('No data provided.')

  let email = data.email || ''
  let password = data.password || ''

  email = email.toLowerCase().trim()
  if (!/^\S+@\S+$/.test(email))
    return fn('Email invalid. Confirm and try again')
  if (password.length < 6)
    return fn('Password should have at least six characters')

  // Email valid, continue
  dbo.db().collection('accounts').findOne({
    email: email
  }, (err, doc) => {
    if (err)
      return fn('There has been an internal error. Please try again later.')

    if (doc)
      return fn('This email is already in use.')

    let salt = crypto.randomBytes(128).toString('base64')
    crypto.pdkdf2(password, salt, 5000, 32, 'sha512', (err, derivedKey) => {
      if (err)
        return fn('There has been an internal error. Please try again later.')

      dbo.db().collection('accounts').insert({
        email: email,
        password: new Buffer(derivedKey).toString('base64'),
        salt,
        reg_date: new Date()
      }, (err, result) => {
        return fn(null, {
          id: result.ops[0]._id,
          email: result.ops[0].email,
          reg_date: result.ops[0].reg_date
        })
      })
    })
  })
}

exports.login = (data, fn) => {
  if (!data)
    return fn('No data provided')

  let email = data.email || ''
  let password = data.password || ''

  email = email.toLowerCase().trim()
  dbo.db().collection('accounts').findOne({ email }, (err, doc) => {
    if (err)
      return fn('There has been an internal error. Please try again later.')

    if (!doc)
      return fn('Email not found.')

    crypto.pbkdf2(password, doc.salt, 5000, 32, 'sha512', (err, derivedKey) => {
      if (err)
        return fn('There has been an internal error. Please try again later.')

      let hash = new Buffer(derivedKey).toString('base64')
      if (hash != doc.password)
        return fn('Wrong password. Confirm and try again.')

      let json = {
        id: doc._id,
        email: doc.email,
        reg_date: doc.reg_date
      }

      if (doc.payid)
        json.payid = doc.payid

      // Update last login
      dbo.db().collection('accounts').update({ email }, {
        $set: {
          ll: new Date()
        }
      })

      return fn(null, json)
    })
  })
}
