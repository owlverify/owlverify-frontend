const jwt = require('jsonwebtoken')
const request = require('request')

module.exports = async (token, callback) => {
  const decodedJwt = jwt.decode(token, { complete: true })

  if (!decodedJwt) {
    console.log('Not a valid JWT token')
    return callback(new Error('Not a valid JWT token'))
  }

  request({
    url: `${decodedJwt.payload.iss}/.well-known/jwks.json`,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      pems = {}
      var keys = body['keys']
      for (var i = 0; i < keys.length; i++) {
        var key_id = keys[i].kid
        var modulus = keys[i].n
        var exponent = keys[i].e
        var key_type = keys[i].kty
        var jwk = { kty: key_type, n: modulus, e: exponent }
        var pem = jwkToPem(jwk)
        pems[key_id] = pem
      }
      var kid = decodedJwt.header.kid
      var pem = pems[kid]
      if (!pem) {
        console.log('Invalid token')
        callback(new Error('Invalid token'))
      }
      jwt.verify(token, pem, function (err, payload) {
        if (err) {
          console.log('Invalid Token.')
          callback(new Error('Invalid token'))
        } else {
          console.log('Valid Token.')
          callback(null, decodedJwt)
        }
      })
    } else {
      console.log('Error! Unable to download JWKs')
      callback(error)
    }
  })
}
