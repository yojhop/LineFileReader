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
        
      }
    })
  }
  findByte(byte,startPlace,step,fileSize){
    return new Promise((resolve,reject)=>{
      
    })
    let offset = startPlace
    let length = step
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
    if(offset >=fileSize){
      return null
    }
    this.randomFile.read(offset,length,(e,data)=>{
      if(e) 
    })
  }
}
let l=new LineFileReader('./test.txt')