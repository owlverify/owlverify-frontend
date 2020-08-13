const jwt = require('jsonwebtoken')

module.exports = async (token, callback) => {
  const decodedJwt = jwt.decode(token, { complete: true })

  if (!decodedJwt) {
    console.log('Not a valid JWT token')
    return callback(new Error('Not a valid JWT token'))
  }

  console.log(decodedJwt)

  callback(null, {})
}
