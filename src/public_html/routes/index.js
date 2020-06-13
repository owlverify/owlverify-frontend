const User = require('../../api/models/user.model')
const File = require('../../api/models/file.model')
const render = require('../../api/lib/utils').render

module.exports = app => {
  app.get('/', (req, res) => {
    res.render('index', render(req))
  })

  app.get('/privacy', (req, res) => {
    res.render('privacy', render(req, {
      title: 'Privacy policy'
    }))
  })
  app.get('/terms', (req, res) => {
    res.render('tos', render(req, {
      title: 'Terms of Service'
    }))
  })

  app.get('/support', (req, res) => {
    res.render('support', render(req, {
      title: 'Support'
    }))
  })

  //Signup
  app.get('/signup', (req, res) => {
    res.render('signup', render(req, {
      title: 'Signup'
    }))
  })

  app.post('/signup', (req, res) => {
    User.createUser(req.body, (err, user) => {
      if (err) {
        req.flash('error', err)
        return res.redirect('/signup')
      }

      req.session.account = user
      return res.redirect('/dashboard')
    })
  })

  // Login
  app.get('/login', (req, res) => {
    res.render('login', render(req, {
      title: 'Login'
    }))
  })

  app.post('/login', (req, res) => {
    User.sessionLogin(req.body, (err, doc) => {
      if (err) {
        req.flash('error', err)
        return res.redirect('/login')
      }

      req.session.account = doc
      if (req.session.ref) {
        let ref = req.session.ref
        delete req.session.ref
        return res.redirect(ref)
      }

      return res.redirect('/dashboard')
    })
  })

  // Recover
  app.get('/recover', (req, res) => {
    res.render('recover', render(req, {
      title: 'Recover password'
    }))
  })

  app.post('/recover', (req, res) => {
    User.recoverPassword(req.body, (err, doc) => {
      if (err)
        req.flash('error', err)
      else
        req.flash('info', 'Password reset mail has been sent')

      return res.redirect('/recover')
    })
  })

  app.get('/dashboard', (req, res) => {
    User.dashboardData(req.session.account, (err, data) => {
      res.render('dashboard', render(req, {
        title: 'Dashboard',
        page: 'dashboard',
        data: data
      }))
    })
  })

  app.get('/files', async (req, res) => {
    let options = {
      sort: 'updated_at'
    };

    if (req.query.sort)
      options.sort = req.query.sort;
    if (req.query.dir)
      options.dir = req.query.dir;
    if (req.query.offset)
      options.offset = req.query.offset;

    await (new File({
      ownerId: req.session.account.id,
      name: "123",
      path: "/123",
    })).save();

    File.getAll(req.session.account, options, (err, data) => {
      console.log(err, data);
      res.render('files', render(req, {
        title: 'Files',
        page: 'files',
        query: req.query,
        data: data
      }))
    })
  })

  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
  })
}
