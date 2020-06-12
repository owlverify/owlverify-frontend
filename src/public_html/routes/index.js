const User = require('../../api/models/user.model')
const render = require('../../api/lib/utils').render

module.exports = app => {
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

      req.session.account = doc;
      if (req.session.ref) {
        let ref = req.session.ref;
        delete req.session.ref;
        return res.redirect(ref);
      }

      return res.redirect('/dashboard')
    })
  })
}
