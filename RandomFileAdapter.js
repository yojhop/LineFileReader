const RandomAccessFile = require('random-access-file')
class RandomFileAdapter{
  constructor(path,blockSize=13000){
    this.randomFile=new RandomAccessFile(path)
    this.blockSize=blockSize
  }
  read(offset,len,callback){
    this.randomFile.read(offset,len,callback)
  }
  stat(callback){
    this.randomFile.stat(callback)
  }
  append(offset, buf, callback ){
      this.randomFile.stat((e,stat)=>{
        if(e!==null){
          callback(e)
          return
        }
        if(buf.length>this.blockSize){
          callback(new Error('buf length larger than block size '+buf.length))
          return
        }
        let currentWrite = offset
        let currentRead = offset
        let bufToWrite=buf
        let bufRead=null
        let writeBuf=()=>{
          return new Promise((resolve,reject)=>{
            this.randomFile.write(currentWrite,bufToWrite,e=>{
              if(e!==null){
                reject(e)
                return
              }
              currentWrite+=bufToWrite.length
              resolve()
            })
          })
        }
        let readBuf=()=>{
          return new Promise((resolve,reject)=>{
            let len = this.blockSize
            if(currentRead+len>=stat.size){
              len = stat.size-currentRead
            }
            this.randomFile.read(currentRead,len,(e,data)=>{
              if(e!==null){
                reject(e)
                return
              }
              bufRead = data
              currentRead += this.blockSize
              resolve(data)
            })
          })
        }
        let fn=()=>{
          if(currentRead>=stat.size){
            writeBuf().then(()=>{callback(null)}).catch(e=>callback(e))
            return
          }
          readBuf().then(()=>{
            writeBuf().then(()=>{
              bufToWrite=bufRead
              fn()
            }).catch(e=>{callback(e)})
          }).catch(e=>{
            console.log('cannot read buf',e)
            callback(e)
          })
        }
        fn()
      })
  }
  write(offset,buf,callback){
    this.randomFile.write(offset,buf,callback)
  }
}
module.exports={RandomFileAdapter}