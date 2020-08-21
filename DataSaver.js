const {LineFileReader} = require('./LineFileReader')
class DataSaver{
  constructor(duration = 5*60*1000){
    this.duration = duartion
  }
  getData(defaultRes,path,start,end){
    let reader = new LineFileReader(path)
  }
}