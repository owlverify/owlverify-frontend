const mongoose = require('mongoose')

/**
 * Password recover token
 * @private
 */
const recoverSchema = new mongoose.Schema({
  resetToken: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectID,
    ref: 'User',
    required: true
  },
  expires: { type: Date },
})

/**
 * Statics
 */
recoverSchema.statics = {

}

const Recover = mongoose.model('Recover', recoverSchema)

/**
 * @typedef Recover
 */
module.exports = Recover
