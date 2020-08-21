const multer = require('multer')
const fs = require('fs')
const User = require('../../api/models/user.model')
const File = require('../../api/models/file.model')
const Payment = require('../../api/models/payment.model')
const render = require('../../api/lib/utils').render
const processInitial = require('../../api/lib/processInitial')
const startVerification = require('../../api/lib/startVerification')
const validateToken = require('../../api/lib/validateToken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

String.prototype.toObjectId = function () {
  var ObjectId = (require('mongoose').Types.ObjectId)
  return new ObjectId(this.toString())
}

// SET STORAGE
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.session.account.id

    const dir = `/tmp/${userId}`
    fs.exists(dir, exist => {
      if (!exist)
        return fs.mkdir(dir, error => cb(error, dir))

      return cb(null, dir)
    })
  },
  filename: function (req, file, cb) {
    cb(null, (file.originalname.replace(/\.[^/.]+$/, '')) + '-' + Date.now() + '.csv')
  }
})
var upload = multer({ storage: storage })

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

  // Login
  app.get('/login', (req, res) => {
    const { token } = req.query

    if (!token) {
      return res.redirect(`https://id.owlhub.io/auth/login?redirect-uri=${req.protocol}://${req.get('host')}/login`)
    }

    validateToken(token, (err, data) => {
      User.sessionLogin(data.payload, (err, doc) => {
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
    }

    if (req.query.sort)
      options.sort = req.query.sort
    if (req.query.dir)
      options.dir = req.query.dir
    if (req.query.offset)
      options.offset = req.query.offset

    File.getAll(req.session.account, options, (err, data) => {
      res.render('files', render(req, {
        title: 'Files',
        page: 'files',
        query: req.query,
        data: data
      }))
    })
  })

  app.post('/files/upload', upload.single('csvFile'), async (req, res, next) => {
    let file = req.file

    file = new File({
      ownerId: req.session.account.id,
      name: file.originalname,
      path: file.path,
    })
    await file.save()

    processInitial(file)

    return res.redirect('/files')
  })

  app.get('/files/:fileId/start', async (req, res, next) => {
    const { fileId } = req.params

    let file = await File.findOne({ _id: fileId.toObjectId(), ownerId: req.session.account.id }).exec()

    const user = await User.findById(req.session.account.id).exec()
    if (user.credits > file.total) {
      file.status = 'processing'
      await file.save()

      await User.findOneAndUpdate({ _id: req.session.account.id }, { $inc: { credits: (-1 * file.total) } }).exec()

      startVerification(file)
    }

    return res.redirect('/files')
  })

  app.get('/files/:fileId/download', async (req, res, next) => {
    const { fileId } = req.params

    let file = await File.findOne({ _id: fileId.toObjectId(), ownerId: req.session.account.id }).exec()

    res.download(file.outputPath)
  })

  app.get('/billing/add-credit', async (req, res, next) => {
    const creditPlan = req.query['credit-plan'] || ''
    const creditQuantity = parseInt(req.query['credit-quantity']) || 0

    let priceId = process.env['PRICE_ID_' + creditPlan.toUpperCase()]
    let quantity = 1 // process.env['QUANTITY_' + creditPlan.toUpperCase()]

    const userInfo = await User.findOne({ _id: req.session.account.id }).exec()
    if (userInfo.stripe && userInfo.stripe.customerId && userInfo.stripe.priceId) {
      priceId = userInfo.stripe.priceId
      quantity = userInfo.stripe.min

      if (quantity < creditQuantity) {
        quantity = creditQuantity
      }
    }

    if (!priceId) {
      return res.redirect('/')
    }

    const domainURL = req.protocol + '://' + req.get('host')

    const stripeParams = {
      payment_method_types: process.env.PAYMENT_METHODS.split(', '),
      mode: 'payment',
      locale: 'en',
      line_items: [
        {
          price: priceId,
          quantity: quantity
        },
      ],
      // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
      success_url: `${domainURL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domainURL}/billing/canceled`,
    }

    if (userInfo.stripe.customerId) {
      stripeParams.customer = userInfo.stripe.customerId
    } else {
      stripeParams.customer_email = userInfo.email
    }

    const session = await stripe.checkout.sessions.create(stripeParams)

    await (new Payment({
      ownerId: req.session.account.id,
      stripeSessionId: session.id,
      plan: creditPlan,
      priceId,
      stripePreSession: session,
      quantity: (userInfo.stripe && userInfo.stripe.customerId && userInfo.stripe.priceId) ? quantity : process.env['QUANTITY_' + creditPlan.toUpperCase()]
    })).save()

    res.render('billing-add-credit', render(req, {
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        sessionId: session.id
      }
    }))
  })

  app.get('/billing/success', async (req, res) => {
    const sessionId = req.query.session_id
    if (!sessionId) {
      return res.redirect('/')
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const payment = await stripe.paymentIntents.retrieve(session.payment_intent)

    if (payment.amount_received === payment.amount) {
      const paymentInfo = await Payment.findOne({ ownerId: req.session.account.id, stripeSessionId: session.id }).exec()
      console.log(paymentInfo)
      if (paymentInfo && paymentInfo.status === 'unpaid') {
        let credits = process.env['QUANTITY_' + (paymentInfo.plan || '').toUpperCase()] || 0

        const userInfo = await User.findOne({ _id: req.session.account.id }).exec()
        if (userInfo.stripe && userInfo.stripe.customerId && userInfo.stripe.priceId) {
          credits = paymentInfo.quantity
        }

        paymentInfo.status = 'paid'
        await paymentInfo.save()

        await User.findOneAndUpdate(req.session.account.id, { $inc: { credits } }).exec()
      }
    }

    res.redirect('/dashboard')
  })

  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
  })
}
