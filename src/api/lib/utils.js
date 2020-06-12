// Inject some variables into template variables
exports.render = (req, _obj) => {
  let obj = {}
  let msgObj
  while (msgObj = req.session.flash.shift()) {
    obj[msgObj.type] = msgObj.message
  }

  if (null == _obj || 'object' != typeof _obj) return obj
  for (let attr in _obj) {
    if (_obj.hasOwnProperty(attr)) obj[attr] = _obj[attr]
  }

  if (req.session.account) {
    for (let attr in req.session.account) {
      obj['acc_' + attr] = req.session.account[attr]
    }
  }

  return obj
}
