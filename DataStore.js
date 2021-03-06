
const {getReader} = require('./GlobalReader')
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
      let reader = getReader(path)
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
      }).catch(e=>{
        console.log(e)
        reject(e)
      })
    })
  }
  // summary {ts:xxx,length}
  getBlockData(reader,defaultReq,start,end){
    console.log('getting',start)
    return new Promise((resolve,reject)=>{
      reader.singleThread(()=>{
        return new Promise((resolve,reject)=>{
          reader.findLine(lineBuf=>{
            let data=lineBuf.toString(this.enCoding)
            if(data.length>0){
              try{
              data=JSON.parse(data)
              }
              catch(e){
                console.log('got error',e,data)
              }
              if(data.ts===start) return 0
              if(data.ts>start) return 1
              if(data.ts<start) return -1
            }
            return -1
          }).then(res=>{
            let summary = JSON.parse(res.data.toString(this.enCoding))
            if(summary.length===0){
              resolve([])
              return
            }
            reader.readContent(res.end+2,summary.length).then(data=>{
              let content = data.toString(this.enCoding)
              let lines = content.split('\n')
              let items = []
              lines.forEach(line=>{
                items.push(JSON.parse(line))
              })
              resolve(items)
            }).catch(e=>{
              console.log(e)
              reject(e)
            })
          }).catch(()=>{
            defaultReq(start,end).then(res=>{
              console.log('get from req',start,end,res.data.length)
              let items=res.data
              let lines=[]
              items.forEach(item=>{
                if(item.ts===start) item.ts=start+0.1
                lines.push(JSON.stringify(item))
              })
              let content=lines.join('\n')
              this.writeBlockData(reader,start,content).finally(()=>{
                resolve(items)
              })
            })
          })
        })
      },resolve,reject,'findLine')
    })
    
  }

  writeBlockData(reader,start,content){
        return new Promise((resolve,reject)=>{
          let buf = Buffer.from(content,this.enCoding)
          let summary = {ts:start,length:buf.length}
          buf= Buffer.concat([Buffer.from(`${JSON.stringify(summary)}\n`,this.enCoding),buf])
          // console.log('debug',start,content.length,buf,`$${buf.toString('utf-8')}$`)
          if(content.length>0) buf.write('\n',buf.length,this.enCoding)
          reader.findPairLines((lineBuf1,lineBuf2)=>{
            let line1 = lineBuf1.toString(this.enCoding)
            let line2 = lineBuf2.toString(this.enCoding)
            let data1 =line1===''?{ts:start-1}: JSON.parse(line1)
            let data2 = line2===''?{ts:start+1}:JSON.parse(line2)
            if(data1.ts<start&&data2.ts>start) return 0
            else if(data1.ts<=start) return -1
            return 1
          }).then(res=>{
            let secondStart = res.secondStart
            console.log('write',secondStart)
            reader.writeContent(buf,secondStart).then(()=>{
              resolve()
            }).catch(e=>reject(e))
          }).catch(()=>{
            // 获取最后一行数据，如果最后一行有数据，并且最后一行ts<=start,则判断最后hasBreak，如果没有hasBreak,则在数据前加入\n，并且插入到end+1位置
                // 如果有hasbreak,则插入到end+2位置
                // 如果最后一行无数据或者如果最后一行ts>start，则获取第一行,如果第一行无数据，则在start处插入数据，如果第一行有数据，则在数据加入\n，并且插入0位置
            reader.getLastLine().then(res=>{
              let lineStr = res.data.toString(this.enCoding)
              if(lineStr.length>0){
                let lineObj = JSON.parse(lineStr)
                if(lineObj.ts<=start){
                  if(lineObj.hasBreak){
                    console.log('write 1',res.end+2)
                    reader.writeContent(buf,res.end+2).then(()=>resolve()).catch(e=>reject(e))
                  } else {
                    console.log('write 2',res.end+1)
                    buf=Buffer.concat([Buffer.from('\n',this.enCoding),buf])
                    reader.writeContent(buf,res.end+1).then(()=>resolve()).catch(e=>reject(e))
                  }
                  return
                }
              }
              reader.getFirstLine().then(res=>{
                let lineStr=res.data.toString(this.enCoding)
                if(lineStr.length>0){
                  console.log(buf.toString(this.enCoding))
                  if(content.length>0) buf=Buffer.concat([buf,Buffer.from('\n',this.enCoding)])
                  console.log('write 3',0)
                  reader.writeContent(buf,0).then(()=>{
                    resolve()
                    debugger
                  }).catch(e=>reject(e))
                }
                else {
                  console.log('write 4',res.start)
                  reader.writeContent(buf,res.start).then(()=>resolve()).catch(e=>reject(e))
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