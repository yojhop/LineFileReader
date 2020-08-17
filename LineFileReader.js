// file.write(offset, buffer, [callback])
// Write a buffer at a specific offset.

// file.read(offset, length, callback)
// Read a buffer at a specific offset. Callback is called with the buffer read.

// file.del(offset, length, callback)
// Will truncate the file if offset + length is larger than the current file length. Is otherwise a noop.
const RandomAccessFile = require('random-access-file')
class LineFileReader{
  // 输入文件路径，生成行文件阅读器
  constructor(filePath){
    this.randomFile = new RandomAccessFile(filePath)
    this.randomFile.stat((e,stat)=>{
      console.log(e,stat)
    })
    console.log('stated')
  }
  findLine(fn){
    this.randomFile.stat((e,stat)=>{
      if(e===null){
        let size = stat.size
        let middle = Math.floor(size/2)
        let works=[this.findByte(10,middle-1,100,size),this.findByte(10,middle,100,size)]
        Promise.all(works).then(([startIndex,endIndex])=>{
          startIndex=startIndex===null?0:startIndex+1
          endIndex = endIndex===null?size-1:endIndex-1
          let len = endIndex-startIndex+1
          this.randomFile.read(startIndex,len,(e,data)=>{
            if(e){
              reject(e)
            } else{
              
            }
          })
        })
      }
    })
  }
  findByte(byte,startPlace,step,fileSize){
    return new Promise((resolve,reject)=>{
      let offset = startPlace
      let length = step
      if(offset >=fileSize||step<0){
        resolve(null)
        return
      }
      if(step<0){
        offset= startPlace+step
        length = -step
      }
      let adjust = 0
      if(offset<0){
        adjust = offset
        offset = 0
      }
      if(offset+length>=fileSize){
        length = fileSize-offset
      }
      this.randomFile.read(offset,length,(e,data)=>{
        if(e) resolve(null)
        else{
          if(step>0){
            let index = data.findIndex(b=>b===byte)
            if(index>=0) resolve(offset+index)
            else{
              offset = offset+step
              this.findByte(byte,offset,step,fileSize).then(index=>{
                resolve(index)
              })
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
            })
          }
        }
      })
    })
    
  }
}
let l=new LineFileReader('./test.txt')
l.findLine()