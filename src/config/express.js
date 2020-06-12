const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const compress = require('compression')
const session = require('express-session')
const sessionStore = require('connect-mongo')(session)
const methodOverride = require('method-override')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path');
const flash = require('flash');
const favicon = require('serve-favicon');

const Liquid = require('liquidjs').Liquid
const engine = new Liquid()

// Filters
// Override 'remove'
engine.registerFilter('remove', (v, arg) => {
  let arr = [],
    arg_arr = arg.split(',')


  // Remove
  for (let _arg of arg_arr) {
    for (let k in v) {
      if (k == _arg)
        delete v[k]
    }
  }
  // Build http query
  for (k in v)
    arr.push([k, '=', v[k]].join(''))

  return arr.join('&')
})
engine.registerFilter('sum', v => {
  if (!v)
    return 0
  return v.reduce((a, b) => {
    return a + b
  }, 0)
})
engine.registerFilter('format', v => {
  if (!v)
    return 0
  return v.toLocaleString()
})
engine.registerFilter('literal_escape', v => {
  if (!v)
    return v
  v = v.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<script[^>]*>[\s\S]*/gi, '').replace(/`/g, '\\`')
  return v
})
engine.registerFilter('colour', v => {
  var hash = 0
  if (v.length == 0) return hash
  for (let i = 0; i < v.length; i++) {
    hash = v.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  shortened = hash % 360
  return 'hsl(' + shortened + ',90%,70%)'
})

const publicRoutes = require('../public_html/routes')
const { logs } = require('./vars')
const error = require('../api/middlewares/error')

/**
 * Express instance
 * @public
 */
const app = express()

// request logging. dev: console | production: file
app.use(morgan(logs))

const sess = {
  secret: process.env.SESSION_KEY || '123',
  maxAge: 3600000 * 24 * 365,
  store: new sessionStore({
    url: `${process.env.MONGO_URI}`,
    ttl: 3600000 * 24 * 365
  }),
  resave: false,
  saveUninitialized: false,
  unset: 'destroy'
}
app.use(session(sess));

app.engine('liquid', engine.express());
app.set('view engine', 'liquid');
app.set('views', __dirname + '/../public_html');
app.use(favicon(path.join(__dirname, '../public_html', 'favicon.ico')));
app.use(flash());

// parse body params and attache them to req.body
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// gzip compression
app.use(compress())

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride())

// secure apps by setting various HTTP headers
app.use(helmet())

// enable CORS - Cross Origin Resource Sharing
app.use(cors())

require('../public_html/routes')(app)

// if error is not an instanceOf APIError, convert it.
app.use(error.converter)

// catch 404 and forward to error handler
app.use(error.notFound)

// error handler, send stacktrace only during development
app.use(error.handler)

module.exports = app
