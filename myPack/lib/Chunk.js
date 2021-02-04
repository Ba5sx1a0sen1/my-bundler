class Chunk {
    constructor(entryModule) {
        this.entryModule = entryModule
        this.name = entryModule.name // 同一个chunk 同一个name
        this.files = [] // 存放每个 chunk 的文件信息
        this.modules = [] // 存放该 chunk 引用包含的模块 module
    }
}

module.exports = Chunk