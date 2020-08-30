const {LineFileReader} = require('./LineFileReader')
const { read } = require('fs')
let reader = new LineFileReader('./candle-huobif-btc.usd.q-1m.data')

function testInsert(series){
  if(series.length>0){
    let firstLine = series[0]
    let t = JSON.parse(firstLine)
    let ts=t.ts
    reader.findPairLines((lineBuf1,lineBuf2)=>{
      let data1 = lineBuf1.toString('utf-8')
      let data2 = lineBuf2.toString('utf-8')
      let obj1=JSON.parse(data1)
      let obj2=JSON.parse(data2)
      if(obj1.ts<ts&&obj2.ts>ts) return 0
      if(obj2.ts<=ts) return -1
      if(obj1.ts>=ts) return 1
    }).then(res=>{
      debugger
      let secondStart = res.secondStart
      series = series.filter(item=>{
        let obj = JSON.parse(item)
        return obj.ts<secondStart
      })
      let content = series.join('\n')
      reader.writeContent(Buffer.from(content,'utf-8'),secondStart).then(()=>{
        console.log('wrote succeed')
      }).catch(e=>{
        console.log('caught wrote error',e)
      })
    }).catch(e=>{
      debugger
      console.log('caught error',e)
    })
  }
}
// testInsert(['{"ts":12,"k":12}','{"ts":13,"k":13}','{"ts":14,"k":14}','{"ts":15,"k":15}'])
// reader.syncGetLastLine().then(res=>{
//   console.log(res.data.toString())
// })
// reader.getFirstLine().then(res=>{
//   console.log(res.data.toString())
// })
// let buf=Buffer.concat([Buffer.from('a'),Buffer.from('\n')])
// console.log(buf)

const {CandleSource} = require('./CandleSource')
const source = new CandleSource('huobif/btc.usd.q','1m')
source.getCandles(1598424762421,1598428362421).then(res=>{
  console.log('get candles',res.length)
}).catch(e=>{
  console.log('got error',e)
})