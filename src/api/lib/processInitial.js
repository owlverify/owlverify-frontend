const csv = require('csvtojson')

module.exports = async (file) => {
  csv()
    .fromFile(file.path)
    .then(async (jsonArr) => {
      console.log(jsonArr)
    });
}
