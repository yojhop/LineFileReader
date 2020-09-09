const {RandomFileAdapter} = require('./RandomFileAdapter')
const fs=require('fs')
class BlockWriter{
  constructor(blockSize=20*1024*1024,step=1000){
    this.locked=false
    this.blockSize=blockSize
    this.syncEnsureFile()
    this.step=step
    // todo 标识是否正在读写
    this.queue=[]
    this.randomFile=null
  }
  ensureFile(){
    return new Promise((resolve,reject)=>{
      fs.exists(this.filePath, (exists) => {
        if (!exists) {
          fs.open(this.filePath, 'w', (err, fd) => {
            if (err) reject(err);
            fs.close(fd,err=>{
              this.randomFile = new RandomFileAdapter(this.filePath)
              if(err) reject(err)
              else resolve()
            })
          })
        } else{
          this.randomFile = new RandomFileAdapter(this.filePath)
          resolve()
        }
      });
    })
  }
  syncEnsureFile(){
    return new Promise((resolve,reject)=>{
      this.singleThread(()=>{
        return this.ensureFile()
      },resolve,reject,'ensurefile')
    })
  }
  singleThread(fn,resolve,reject,name){
    if(this.locked){
      this.queue.push({fn,resolve,reject,name})
    }
    else{
      this.locked=true
      fn().then(res=>{
        resolve(res)
        this.processQueue()
      }).catch(e=>{
        reject(e)
        this.processQueue()
      })
    }
  }
  writeBlock(start,value,buf){

  }
  getSummary(){
    return new Promise((resolve,reject)=>{
      this.randomFile.stat((e,stat)=>{
        if(e){
          reject(e)
          return
        }
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
        if(e) reject(e)
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
            offset = offset+step
            this.findByte(byte,offset,step,fileSize).then(index=>{
              resolve(index)
            }).catch(e=>reject(e))
          }
        }
      })
    })
  }
  processQueue(){
    if(this.queue.length>0){
      let item =this.queue.shift()
      item.fn().then(res=>{
        item.resolve(res)
        this.processQueue()
      }).catch(e=>{
        item.reject(e)
        this.processQueue()
      })
    } else{
      this.locked=false
    }
  }
}