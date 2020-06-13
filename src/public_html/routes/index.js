const User = require('../../api/models/user.model')
const render = require('../../api/lib/utils').render

module.exports = app => {
  //Signup
  app.get('/signup', (req, res) => {
    console.log(res)
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

      res.session.account = user
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

  app.get('/files', (req, res) => {
    res.render('files', render(req, {
      title: 'Files',
      page: 'files'
    }))
  })
}
