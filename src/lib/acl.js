module.exports = () => {
  return (req, res, next) => {
    // Cache control
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");

    let url = req.url.substring(1),
      page;

    // If session doesnot exist and accessing any of the secured pages
    let secured = ['dashboard', 'files'];
    let login = ['login', 'recover'];
    if (!req.session.account) {
      for (page of secured) {
        if (url.lastIndexOf(page, 0) === 0) {
          req.session.ref = req.url;
          return res.redirect('/login');
        }
      }
    } else {
      // If logged in but accessing "login pages"
      for (page in login) {
        if (url.lastIndexOf(page, 0) === 0) {
          return res.redirect('/dashboard');
        }
      }
    }

    next();
  }
}
