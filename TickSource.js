const {DataStore} = require('./DataStore')
const axios = require('axios')
class TickSource{
  constructor(contract){
    this.contract=contract
    this.path=`./zhubi-${contract.replace('/','-')}.data`
    this.store = new DataStore(60*60*1000)
  }
  getTicks(start,end){
    let req = (s,e)=>{
      return new Promise((resolve,reject)=>{
        s = Math.floor(s/1000)
        e= Math.ceil(e/1000)
        let url = `https://1token.trade/api/v1/quote/zhubi?source=t0&size=1500000000&contract=${this.contract}&since=${s}&until=${e}&force=true`
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

module.exports={TickSource}