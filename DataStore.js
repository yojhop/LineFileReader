const {LineFileReader} = require('./LineFileReader')
const { read } = require('fs')
const { resolve } = require('path')
class DataStore{
  constructor(duration = 5*60*1000,enCoding='utf-8'){
    this.duration = duration
    this.enCoding=enCoding
  }
  getData(defaultReq,path,start,end){
    return new Promise((resolve,reject)=>{
      if(start===end){
        resolve([])
        return
      }
      let startTs = Math.floor(start/this.duration)*this.duration
      let endTs = Math.ceil(end/this.duration)*this.duration
      let promises = []
      let reader = new LineFileReader(path)
      while(startTs<endTs){
        promises.push(this.getBlockData(reader,defaultReq,startTs,startTs+this.duration))
        startTs+=this.duration
      }
      Promise.all(promises).then(blocks=>{
        let datas=[]
        blocks.forEach((block,i)=>{
          if(i===0){
            block = block.filter(item=>item.ts>=start)
          }
          if(i===blocks.length-1){
            block = block.filter(item=>item.ts<end)
          }
          datas=datas.concat(block)
        })
        resolve(datas)
      }).catch(e=>reject(e))
    })
  }
  // summary {ts:xxx,length}
  getBlockData(reader,defaultReq,start,end){
    let printed=false
    return new Promise((resolve,reject)=>{
      console.log('getting',start,end)
      reader.syncFindLine(lineBuf=>{
        let data=lineBuf.toString(this.enCoding)
        if(data.length>0){
          data=JSON.parse(data)
          console.log(data.ts)
          if(data.ts===start) return 0
          if(data.ts>start) return 1
          if(data.ts<start) return -1
        }
        return -1
      }).then(res=>{
        
        let summary = JSON.parse(res.data.toString(this.enCoding))
        console.log('found res',summary)
        reader.syncRead(res.end+2,summary.length).then(data=>{
          let content = data.toString(this.enCoding)
          let lines = content.split('\n')
          let items = []
          lines.forEach(line=>{
            items.push(JSON.parse(line))
          })
          resolve(items)
        }).catch(e=>reject(e))
      }).catch(e=>{
        console.log(e)
        defaultReq(start,end).then(res=>{
          let items=res.data
          let lines=[]
          items.forEach(item=>{
            if(item.ts===start) item.ts=start+0.1
            lines.push(JSON.stringify(item))
          })
          let content=lines.join('\n')
          this.writeBlockData(reader,start,content)
          resolve(items)
        })
      })
    })
  }
  writeBlockData(reader,start,content){
    return new Promise((resolve,reject)=>{
      let buf = Buffer.from(content,this.enCoding)
      let summary = {ts:start,length:buf.length}
      console.log(buf)
      buf= Buffer.concat([Buffer.from(`${JSON.stringify(summary)}\n`,this.enCoding),buf])
      console.log(Buffer.from(`${JSON.stringify(summary)}\n`,this.enCoding))
      console.log(buf)
      if(content.length>0) buf.write('\n',buf.length,this.enCoding)
      reader.syncFindPairLines((lineBuf1,lineBuf2)=>{
        let data1 = JSON.parse(lineBuf1.toString(this.enCoding))
        let data2 = JSON.parse(lineBuf2.toString(this.enCoding))
        if(data1.ts<start&&data2.ts>start) return 0
        else if(data1.ts<=start) return -1
        return 1
      }).then(res=>{
        let secondStart = res.secondStart
        console.log('write 1')
        reader.syncWrite(buf,secondStart).then(()=>{
          resolve()
        }).catch(e=>reject(e))
      }).catch(()=>{
        // 获取最后一行数据，如果最后一行有数据，并且最后一行ts<=start,则判断最后hasBreak，如果没有hasBreak,则在数据前加入\n，并且插入到end+1位置
            // 如果有hasbreak,则插入到end+2位置
            // 如果最后一行无数据或者如果最后一行ts>start，则获取第一行,如果第一行无数据，则在start处插入数据，如果第一行有数据，则在数据加入\n，并且插入0位置
        reader.syncGetLastLine().then(res=>{
          let lineStr = res.data.toString(this.enCoding)
          if(lineStr.length>0){
            let lineObj = JSON.parse(lineStr)
            if(lineObj.ts<=start){
              if(lineObj.hasBreak){
                console.log('write 2')
                reader.syncWrite(buf,res.end+2).then(()=>resolve()).catch(e=>reject(e))
              } else {
                console.log('write 3')
                buf=Buffer.concat([Buffer.from('\n',this.enCoding),buf])
                reader.syncWrite(buf,res.end+1).then(()=>resolve()).catch(e=>reject(e))
              }
              return
            }
          }
          reader.syncGetFirstLine().then(res=>{
            let lineStr=res.data.toString(this.enCoding)
            if(lineStr.length>0){
              console.log('write 4')
              buf=Buffer.concat([buf,Buffer.from('\n',this.enCoding)])
              reader.syncWrite(buf,0).then(()=>resolve()).catch(e=>reject(e))
            }
            else {
              console.log('write 5')
              reader.syncWrite(buf,res.start).then(()=>resolve()).catch(e=>reject(e))
            }
          }).catch(e=>{
            reject(e)
          })
        })
      })
    })
  }
}
module.exports={DataStore}