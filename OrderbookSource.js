const {DataStore} = require('./DataStore')
const axios = require('axios')
class OrderbookSource{
  constructor(contract){
    this.contract=contract
    this.path=`./orderbook-${contract.replace('/','-')}.data`
    this.store = new DataStore(60*60*1000)
  }
  getOrderbooks(start,end){
    let req = (s,e)=>{
      return new Promise((resolve,reject)=>{
        s = Math.floor(s/1000)
        e= Math.ceil(e/1000)
        let url = `https://hist-quote.1tokentrade.cn/flat-ticks?since=${s}&until=${e}&contract=${contract}&source=t0&lang=zh_cn`
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

module.exports={OrderbookSource}