render = require('../../api/lib/utils.js').render

module.exports = app => {
  // Signup
  app.get('/signup', (req, res) => {
    res.render('signup', render(req, {
      title: 'Signup'
    }));
  });
}
