const mongoose = require('mongoose')

/**
 * File Status
 */
const status = ['unpaid', 'paid', 'failed']

/**
 * File Schema
 * @private
 */
const paymentSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectID,
    ref: 'User',
    required: true,
    index: true
  },
  stripeSessionId: {
    type: String,
    required: true,
    trim: true,
  },
  plan: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  priceId: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: status,
    default: 'unpaid',
  },
  quantity: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
})

/**
 * @typedef File
 */
module.exports = mongoose.model('Payments', paymentSchema)
