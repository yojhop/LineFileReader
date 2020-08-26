const {DataStore} = require('./DataStore')
const axios = require('axios')
const { resolve } = require('path')
class CandleSource{
  constructor(contract,duration){
    this.contract=contract
    this.duration=duration
    this.path=`./candle-${contract.replace('/','-')}-${duration}.data`
    this.store = new DataStore(60*60*1000)
  }
  getCandles(start,end){
    let req = (s,e)=>{
      return new Promise((resolve,reject)=>{
        s = Math.floor(s/1000)
        e= Math.ceil(e/1000)
        let url = `https://1token.trade/api/v1/quote/candles?source=web&contract=${this.contract}&since=${s}&until=${e}&duration=${this.duration}&force=true`
        axios.get(url).then(res=>{
          console.log('getting from req')
          res.data.forEach(item=>item.ts = item.timestamp*1000)
          resolve(res)
        }).catch(e=>reject(e))
      })
    }
    return this.store.getData(req,this.path,start,end)
  }
}

module.exports={CandleSource}