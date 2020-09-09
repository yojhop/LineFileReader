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
const fs = require('fs')
const source = new CandleSource('huobif/btc.usd.q','1m')
let start = 1598424762421
let end = start+30*3600*1000
// asyncProcessTime(start,end)
// source.getCandles(start,start+3600*1000).then(()=>{
//   source.getCandles(1577836800000,1577836800000+3600*1000)
// })
// source.getCandles(1598493600000,1598493600000+3600*1000).then(res=>{
//   console.log('got candles',res)
// })
start=1599523200000
reader.syncFindLine(lineBuf=>{
  let data=lineBuf.toString(this.enCoding)
  if(data.length>0){
    try{
    data=JSON.parse(data)
    console.log('checking',data.ts)
    }
    catch(e){
      // debugger
      console.log('got error')
      // console.log('got error',e,data)
    }
    if(data.ts===start) return 0
    if(data.ts>start) return 1
    if(data.ts<start) return -1
  }
  return -1
}).then(res=>{
  console.log('found res')
})
// source.getCandles(1598504400000,1598504400000+3600*1000).then(res=>{
//   console.log('got candles',res)
// })
// function processTime(start,end){
//   source.getCandles(start,start+3600*1000).then(res=>{
//     start+=3600*1000
//     if(start<end){
//       processTime(start,end)
//     }
//   }).catch(e=>{
//     console.log('got error',e)
//   })
// }
// function asyncProcessTime(start,end){
//   while(start<end){
//     source.getCandles(start,start+3600*1000)
//     start+=3600*1000
//   }
// }
// const RandomAccessFile = require('random-access-file')
// var fd = fs.openSync('./test.txt', 'a+');
// let buf = Buffer.from('k')
// fs.writeSync(fd, buf, 0, buf.length, 0);
// fs.open('./test.txt','a',(e,fd)=>{
//   console.log(e)
//   fs.writeSync(fd,)
//   fs.write(fd,Buffer.from('c'),0,1,0,()=>{
//     fs.write(fd,Buffer.from('d'),0,1,0,()=>{})
//   })
// })