require('dotenv').config()
const express = require('express');

const Liquid = require('liquidjs').Liquid;
const engine = new Liquid();
const moment = require('moment');
const session = require('express-session');
const sessionStore = require('connect-mongo')(session)
const bodyParser = require('body-parser')
const helmet = require('helmet');
const path = require('path');
const flash = require('flash');
const compression = require('compression');
const favicon = require('serve-favicon');

const acl = require('./lib/acl.js');
const dbo = require('./lib/db.js');

dbo.connect(err => {
  // Config
  const app = express();
  app.listen(process.env.PORT || 3000);
  app.use(helmet());

  // Index DB
  require('./lib/indexes.js')(dbo);

  // Filters
  // Override 'remove'
  engine.registerFilter('remove', (v, arg) => {
    let arr = [],
      arg_arr = arg.split(',')
    ;

    // Remove
    for (let _arg of arg_arr) {
      for (let k in v) {
        if (k == _arg)
          delete v[k];
      }
    }
    // Build http query
    for (k in v)
      arr.push([k, '=', v[k]].join(''));

    return arr.join('&');
  });
  engine.registerFilter('sum', v => {
    if (!v)
      return 0;
    return v.reduce((a, b) => {
      return a + b;
    }, 0);
  });
  engine.registerFilter('format', v => {
    if (!v)
      return 0;
    return v.toLocaleString();
  });
  engine.registerFilter('literal_escape', v => {
    if (!v)
      return v;
    v = v.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<script[^>]*>[\s\S]*/gi, '').replace(/`/g, '\\`')
    return v;
  });
  engine.registerFilter('colour', v => {
    var hash = 0;
    if (v.length == 0) return hash;
    for (let i = 0; i < v.length; i++) {
      hash = v.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    shortened = hash % 360;
    return "hsl(" + shortened + ",90%,70%)";
  });

  // Middlewares
  const sess = {
    secret: process.env.SESSION_KEY,
    maxAge: 3600000 * 24 * 365,
    store: new sessionStore({
      url: `${process.env.DB_URL}`,
      ttl: 3600000 * 24 * 365
    }),
    resave: false,
    saveUninitialized: false,
    unset: 'destroy'
  }
  app.use(session(sess));

  app.engine('liquid', engine.express());
  app.set('view engine', 'liquid');
  app.set('views', __dirname + '/public_html');
  app.use(favicon(path.join(__dirname, 'public_html', 'favicon.ico')));
  app.use(flash());
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(bodyParser.text());
  app.use(express.static(__dirname + '/public_html_static'));
  app.use(acl());

  // Routes
  require('./routes/auth.js')(app)
})
