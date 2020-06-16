const async = require('async')
const csv = require('csvtojson')
var fs = require('fs')
var { Parser } = require('json2csv')

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
      console.log(work)

      /*
      csv()
    .fromFile(file.path)
    .then(async (jsonArr) => {
      console.log(jsonArr)
    });
       */

      let data = JSON.parse(JSON.stringify(work))
      delete data.options
      filesData[work.options.fileName].push(Object.assign(data, {
        status: 'unknown'
      }))

      resolve()
    })()
  })
})

module.exports = async (file) => {
  let fileName = file.ownerId.toString() + '-' + file._id.toString()

  filesData[fileName] = []
  console.log(filesData)

  csv()
    .fromFile(file.path)
    .then(async (jsonArr) => {
      queue(worker, jsonArr, 50, {
        fileName
      }).then(value => {
        console.log('complete!!!', value)

        var json2csvParser = new Parser({
          fields: Object.keys(filesData[fileName][0])
        })
        const csv = json2csvParser.parse(filesData[fileName])
        fs.writeFileSync('/tmp/output-' + file.name, csv)
      })
    })
}
