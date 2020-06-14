const async = require('async')
const csv = require('csvtojson')
const File = require('../models/file.model')

function queue (worker, work, concurrency) {
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
      q.push(work)
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

      resolve()
    })()
  })
})

async function asyncForEach (array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports = async (file) => {
  csv()
    .fromFile(file.path)
    .then(async (jsonArr) => {
      let count = 0
      await asyncForEach(jsonArr, async (data) => {
        if (data.Email || data.email) {
          count ++;
        }
      })

      file.total = count;
      find.status = 'uploaded'
      file.save();

      console.log(count)
    });
}
