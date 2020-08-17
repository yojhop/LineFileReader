const utf8 = require('utf8');
console.log(Buffer.from('还好\n', 'utf-8')[6])

const RandomAccessFile = require('random-access-file')

new RandomAccessFile('./test.txt').read(0,60,(e,data)=>{
  console.log(data.findIndex(byte=>byte===50))
})