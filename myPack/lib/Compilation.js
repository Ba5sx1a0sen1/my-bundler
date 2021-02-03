const path = require('path')
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
        this.entries = [] // 存入所有入口模块的数组
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

    _addModuleChain(context, entry, name, callback) {
        let entryModule = normalModuleFactory.create({
            name,
            context,
            rawRequest: entry,
            resource: path.posix.join(context, entry), // 当前操作的核心作用就是返回 entry 的绝对路径
            parser
        })

        const afterBuild = function (err) {
            callback(err, entryModule)
        }

        this.buildModule(entryModule, afterBuild)

        // 当我们完成了本次的 build 操作之后将 module 进行保存
        this.entries.push(entryModule)
        this.modules.push(entryModule)
    }
}

module.exports = Compilation