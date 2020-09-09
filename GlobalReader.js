const {LineFileReader} = require('./LineFileReader')
let globalObjects={readersMap:{}}

function getReader(path){
  if(path in globalObjects.readersMap) return globalObjects.readersMap[path]
  let reader = new LineFileReader(path)
  globalObjects.readersMap[path]=reader
  return reader
}
module.exports={getReader}