// file.write(offset, buffer, [callback])
// Write a buffer at a specific offset.

// file.read(offset, length, callback)
// Read a buffer at a specific offset. Callback is called with the buffer read.

// file.del(offset, length, callback)
// Will truncate the file if offset + length is larger than the current file length. Is otherwise a noop.
const RandomAccessFile = require('random-access-file')
class LineFileReader{
  // 输入文件路径，生成行文件阅读器
  constructor(filePath,step=1000){
    this.randomFile = new RandomAccessFile(filePath)
    this.randomFile.stat((e,stat)=>{
      // console.log(e,stat)
    })
    this.step=step
    console.log('stated')
  }
  writeContent(buf,offset){
    return new Promise((resolve,reject)=>{
      this.randomFile.write(offset, buf,(e)=>{
        if(e) reject(e)
        else resolve()
      })
    })
  }
  readContent(start,len){
    return new Promise((resolve,reject)=>{
      this.randomFile.read(start,len,(e,data)=>{
        if(e) reject(e)
        else resolve(data)
      })
    })
  }
  findLine(fn,start=-1,end=-1,lastStart = -1,lastEnd=-1){
    return new Promise((resolve,reject)=>{
      start = start===-1?0:start
        this.randomFile.stat((e,stat)=>{
          if(e===null){
            let size = stat.size
            end = end===-1?size-1:end
            let middle = Math.floor(start+(end-start)/2)
            let works=[this.findByte(10,middle-1,-this.step,size),this.findByte(10,middle,this.step,size)]
            Promise.all(works).then(([startIndex,endIndex])=>{
              startIndex=startIndex===null?0:startIndex+1
              endIndex = endIndex===null?size-1:endIndex-1
              if(startIndex===lastStart&&endIndex===lastEnd){
                reject(new Error('Cannot find match line'))
                return
              }
              let len = endIndex-startIndex+1
              this.randomFile.read(startIndex,len,(e,data)=>{
                if(e){
                  reject(e)
                } else{
                  let ret = fn(data)
                  if(ret===0) resolve({data,start:startIndex,end:endIndex})
                  else if(ret<0){
                    this.findLine(fn,middle,end,startIndex,endIndex,).then(d=>resolve(d)).catch(e=>reject(e))
                  } else this.findLine(fn,start,middle,startIndex,endIndex,).then(d=>resolve(d)).catch(e=>reject(e))
                }
              })
            }).catch(e=>reject(e))
          } else reject(e)
        })
    })
  }
  getLastLine(){
    return new Promise((resolve,reject)=>{
      this.randomFile.stat((e,stat)=>{
        if(e){
          reject(e)
        } else{
          let endIndex = stat.size-1
          this.findByte(10,endIndex,-this.step,stat.size).then(index=>{
            if(index===stat.size-1){
              endIndex--
              this.findByte(10,endIndex,-this.step,stat.size).then(i=>{
                i=i===null?0:i
                if(endIndex>i){
                  let startIndex = i+1
                  let length = endIndex-startIndex+1
                  this.randomFile.read(startIndex,length,(e,data)=>{
                    if(e) reject(e)
                    else resolve({data,start:startIndex,end:endIndex})
                  })
                } else resolve({data:Buffer.from('','utf-8'),start:-1,end:-1})
              })
            } else {
              this.randomFile.read(index+1,stat.size-index-1,(e,data)=>{
                if(e) reject(e)
                else resolve({data,start:index+1,end:stat.size-1})
              })
            }
          })
        }
      })
    })
    
  }
  findPairLines(fn,start=-1,end=-1,lastStart = -1,lastEnd=-1){
    return new Promise((resolve,reject)=>{
      start = start===-1?0:start
        this.randomFile.stat((e,stat)=>{
          if(e===null){
            let size = stat.size
            end = end===-1?size-1:end
            let middle = Math.floor(start+(end-start)/2)
            let works=[this.findByte(10,middle-1,-this.step,size),this.findByte(10,middle,this.step,size)]
            Promise.all(works).then(([startIndex,endIndex])=>{
              startIndex=startIndex===null?0:startIndex+1
              if(endIndex===null){
                reject(new Error('Cannot find match line'))
                return
              }
              this.findByte(10,endIndex+1,this.step,size).then(secondEnd=>{
                endIndex = endIndex-1
                secondEnd = secondEnd===null?size-1:secondEnd-1
                if(startIndex===lastStart&&endIndex===lastEnd){
                  reject(new Error('Cannot find match line'))
                  return
                }
                let len = endIndex-startIndex+1
                this.randomFile.read(startIndex,len,(e,data)=>{
                  if(e){
                    reject(e)
                  } else{
                    let secondStart = endIndex+2
                    let secondLen = secondEnd-secondStart+1
                    this.randomFile.read(secondStart,secondLen,(se,secondData)=>{
                      if(se){
                        reject(see)
                      }
                      else{
                        let ret = fn(data,secondData)
                        if(ret===0) resolve({pair:[data,secondData],start:startIndex,end:endIndex,secondStart,secondEnd})
                        else if(ret<0){
                          this.findPairLines(fn,middle,end,startIndex,endIndex).then(d=>resolve(d)).catch(e=>reject(e))
                        } else this.findPairLines(fn,start,middle,startIndex,endIndex).then(d=>resolve(d)).catch(e=>reject(e))
                      }
                    })
                  }
                })
              }).catch(e=>{
                reject(e)
              })
            }).catch(e=>reject(e))
          } else reject(e)
        })
    })
  }
  findByte(byte,startPlace,step,fileSize){
    return new Promise((resolve,reject)=>{
      let offset = startPlace
      let length = step
      if(offset >=fileSize||offset<0){
        resolve(null)
        return
      }
      if(step<0){
        offset= startPlace+step+1
        length = -step
      }
      if(offset<0){
        offset = 0
      }
      if(offset+length>=fileSize){
        length = fileSize-offset
      }
      if(step<0&&offset+length>=startPlace+1){
        length = startPlace-offset+1
      }
      this.randomFile.read(offset,length,(e,data)=>{
        if(e) reject(new Error('read error'))
        else{
          if(step>0){
            let index = data.findIndex(b=>b===byte)
            if(index>=0) resolve(offset+index)
            else{
              offset = offset+step
              this.findByte(byte,offset,step,fileSize).then(index=>{
                resolve(index)
              }).catch(e=>reject(e))
            }
          } else {
            let dataLen = data.length
            while(dataLen--){
              if(data[dataLen]===byte){
                resolve(offset+dataLen)
                return
              }
            }
            this.findByte(byte,offset,step,fileSize).then(index=>{
              resolve(index)
            }).catch(e=>reject(e))
          }
        }
      })
    })
  }
}
function bufferToInts(buf){
  let str=[]
  for(let b of buf){
    str.push(b.toString())
  }
  return '('+str.join(',')+')'
}
function test(ts){
  let l=new LineFileReader('./test.txt')
  l.findLine(lineBuf=>{
    let data = lineBuf.toString('utf-8')
    let obj=JSON.parse(data)
    if(obj.ts===ts) return 0
    if(obj.ts<ts) return -1
    if(obj.ts>ts) return 1
  }).then(res=>{
    console.log('found line',res.toString('utf-8'))
  }).catch(e=>{
    console.log('caught error',e)
  })
}
// function testFindPair(ts){
//   let l=new LineFileReader('./test.txt')
//   l.findPairLines((lineBuf1,lineBuf2)=>{
//     let data1 = lineBuf1.toString('utf-8')
//     let data2 = lineBuf2.toString('utf-8')
//     let obj1=JSON.parse(data1)
//     let obj2=JSON.parse(data2)
//     if(obj1.ts<=ts&&obj2.ts>=ts) return 0
//     if(obj2.ts<ts) return -1
//     if(obj1.ts>ts) return 1
//   }).then(res=>{
//     res.forEach(r=>{
//       console.log(JSON.parse(r.toString()))
//     })
//   }).catch(e=>{
//     console.log('caught error',e)
//   })
// }
// testFindPair(16)
module.exports={LineFileReader}