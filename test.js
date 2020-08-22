const {LineFileReader} = require('./LineFileReader')
const { read } = require('fs')
let reader = new LineFileReader('./test.txt')

function testInsert(series){
  debugger
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
testInsert(['{"ts":12,"k":12}','{"ts":13,"k":13}','{"ts":14,"k":14}','{"ts":15,"k":15}'])
// reader.getLastLine().then(res=>{
//   console.log(res.data.toString())
// })