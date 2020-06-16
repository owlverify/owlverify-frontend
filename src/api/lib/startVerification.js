const async = require('async')
const csv = require('csvtojson')
var fs = require('fs')
var { Parser } = require('json2csv')
var OWLHUB = require('owlhub-sdk')

var OwlVerify = new OWLHUB.OwlVerify({ apiVersion: '2020-05-10' })

const filesData = {}

var dataArr = []

function queue (worker, work, concurrency, options) {
  console.log('started, with concurrency=' + concurrency)
  return new Promise(function (resolve, reject) {
    if (work.length === 0) {
      resolve()
    } else {
      var firstError

      var q = async.queue(worker, concurrency)
      q.drain(function () {
        resolve()
      })

      q.error(function (error) {
        if (firstError === undefined) {
          // only reject with the first error;
          firstError = error
        }

        // don't start any new work
        q.kill()

        // but wait untill all pending work completes before reporting
        q.drain(function () {
          reject(firstError)
        })
      })
      q.push(work.map(w => Object.assign(w, { options })))
    }
  })
}

const worker = async.asyncify(function (work) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (work.Email || work.email) {
          var validationResult = await OwlVerify.validateEmail({
            Email: work.Email || work.email
          }).promise()

          work.status = (validationResult.Status || 'unknown').toUpperCase()
        } else {
          work.status = 'NO_EMAIL_FOUND'
        }
      } catch (e) {
        console.log('error', e)
        work.status = 'Internal Error. contact at support@owlhub.io'
      } finally {
        let data = JSON.parse(JSON.stringify(work))
        delete data.options
        filesData[work.options.fileName].push(data)
      }

      resolve()
    })()
  })
})

module.exports = async (file) => {
  let fileName = file.ownerId.toString() + '-' + file._id.toString()

  filesData[fileName] = []

  csv()
    .fromFile(file.path)
    .then(async (jsonArr) => {
      queue(worker, jsonArr, 50, {
        fileName
      }).then(async (value) => {
        console.log('complete!!!', value)

        var json2csvParser = new Parser({
          fields: Object.keys(filesData[fileName][0])
        })

        const csv = json2csvParser.parse(filesData[fileName])

        let outputPath = `/tmp/${file.ownerId}/output-${file.name.replace(/\.[^/.]+$/, "")}-` + Date.now() + '.csv';
        fs.writeFileSync(outputPath, csv)

        file.status = 'verified'
        file.outputPath = outputPath
        await file.save()
      })
    })
}
