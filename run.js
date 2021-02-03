let webpack = require('./myPack')
let options = require('./webpack.config.js')

let compiler = webpack(options)

compiler.run((err, stats) => {
    console.log(err)
    // console.log(stats)
})