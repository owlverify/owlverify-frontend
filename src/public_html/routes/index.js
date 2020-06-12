render = require('../../api/lib/utils.js').render

module.exports = app => {
  // Login
  app.get('/login', (req, res) => {
    res.render('login', render(req, {
      title: 'Login'
    }));
  });
}
