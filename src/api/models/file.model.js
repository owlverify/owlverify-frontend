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

/**
 * @typedef File
 */
module.exports = mongoose.model('Files', fileSchema)
