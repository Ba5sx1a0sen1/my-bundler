const { Tapable, SyncHook } = require('tapable')
class Compilation extends Tapable {
    constructor(compiler) {
        super()
        this.compiler = compiler
        this.context = compiler.context
        this.options = compiler.options
        // 让 compilation 具备文件读写能力
        this.inputFileSystem = compiler.inputFileSystem
        this.outputFileSystem = compiler.outputFileSystem
        this._entries = [] // 存入所有入口模块的数组
        this.modules = [] // 存放所有模块的数组
        this.hooks = {
            succeedModule: new SyncHook(['module'])
        }
    }

    /**
     * 完成模块编译操作
     * @param {*} context 当前项目的跟
     * @param {*} entry 当前的入口的相对路径
     * @param {*} name chunkName 当前案例为 main
     * @param {*} callback 回调函数
     */
    addEntry(context, entry, name, callback) {
        this._addModuleChain(context, entry, name, (err, module) => {
            callback(err, module)
        })
    }
}

module.exports = Compilation