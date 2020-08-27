// file.write(offset, buffer, [callback])
// Write a buffer at a specific offset.

// file.read(offset, length, callback)
// Read a buffer at a specific offset. Callback is called with the buffer read.

// file.del(offset, length, callback)
// Will truncate the file if offset + length is larger than the current file length. Is otherwise a noop.
// todo 如果单行为 xxx\nyyyyyyyyyy, 则index/2可能一直在yyyyy行，而匹配在xxx行
const RandomAccessFile = require('random-access-file')
const fs=require('fs')
class LineFileReader{
  // 输入文件路径，生成行文件阅读器
  constructor(filePath,step=1000){
    this.filePath=filePath
    this.randomFile=null
    this.locked=false
    this.syncEnsureFile()
    this.step=step
    // todo 标识是否正在读写
    this.queue=[]
  }
  ensureFile(){
    return new Promise((resolve,reject)=>{
      fs.exists(this.filePath, (exists) => {
        if (!exists) {
          fs.open(this.filePath, 'w', (err, fd) => {
            if (err) reject(err);
            fs.close(fd,err=>{
              this.randomFile = new RandomAccessFile(this.filePath)
              if(err) reject(err)
              else resolve()
              console.log('file touched')
            })
          })
        } else{
          this.randomFile = new RandomAccessFile(this.filePath)
          resolve()
        }
      });
    })
  }
  // 如果当前locked状态为true,则将该请求加入queue，否则设置locked为true，处理请求后处理queue
  singleThread(fn,resolve,reject){
    if(this.locked) this.queue.push({fn,resolve,reject})
    else{
      this.locked=true
      fn().then(res=>{
        resolve(res)
      }).catch(e=>{reject(e);console.log('got error',e)}).finally(()=>{
        
        this.processQueue()
      })
    }
  }
  syncEnsureFile(){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.ensureFile()
      },resolve,reject)
    })
  }
  syncRead(start,len){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.readContent(start,len)
      },resolve,reject)
    })
  }
  syncWrite(buf,offset){
    console.log('writing',buf.length,offset)
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.writeContent(buf,offset)
      },resolve,reject)
    })
  }
  processQueue(){
    if(this.queue.length>0){
      let item =this.queue.shift()
      item.fn().then(res=>item.resolve(res)).catch(e=>item.reject(e)).finally(()=>{
        this.processQueue()
      })
    } else this.locked=false
  }
  // 处理queue，递归调用，当queue为空，则将locked设置为false
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
  syncFindLine(fn,start,end,lastStart,lastEnd){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.findLine(fn,start,end,lastStart,lastEnd)
      },resolve,reject)
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
  syncGetFirstLine(){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.getFirstLine()
      },resolve,reject)
    })
  }
  //  获取文件第一行，从文件开头查找下一个\n，如果未找到，则读取整个文件内容，resolve
  // 如果找到下一个\n，则resolve从0到\n之间的内容
  getFirstLine(){
    return new Promise((resolve,reject)=>{
      this.randomFile.stat((e,stat)=>{
        if(e) reject(e)
        else{
          this.findByte(10,0,this.step,stat.size).then(index=>{
            if(index===null){
              if(stat.size>0){
                this.randomFile.read(0,stat.size-1,(e,data)=>{
                  resolve({data,start:0,end:stat.size-1})
                })
              } else {
                resolve({data:Buffer.from(''),start:0,end:0})
              }
            } else {
              this.randomFile.read(0,index,(e,data)=>{
                if(e) reject(e)
                else resolve({data,start:0,end:index-1})
              })
            }
          }).catch(e=>reject(e))
        }
      })
      
    })
  }
  syncGetLastLine(){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.getLastLine()
      },resolve,reject)
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
            index=index===null?endIndex:index
            if(index===stat.size-1){
              endIndex--
              this.findByte(10,endIndex,-this.step,stat.size).then(i=>{
                i=i===null?0:i
                if(endIndex>i){
                  let startIndex = i+1
                  let length = endIndex-startIndex+1
                  this.randomFile.read(startIndex,length,(e,data)=>{
                    if(e) reject(e)
                    else resolve({data,start:startIndex,end:endIndex,hasBreak:true})
                  })
                } else resolve({data:Buffer.from('','utf-8'),start:-1,end:-1,hasBreak:true})
              })
            } else {
              this.randomFile.read(index+1,stat.size-index-1,(e,data)=>{
                if(e) reject(e)
                else resolve({data,start:index+1,end:stat.size-1,hasBreak:false})
              })
            }
          })
        }
      })
    })
  }
  syncFindPairLines(fn,start,end,lastStart,lastEnd){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.findPairLines(fn,start,end,lastStart,lastEnd)
      },resolve,reject)
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
module.exports={LineFileReader}