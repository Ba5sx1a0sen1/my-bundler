const path = require('path')
const Parser = require('./Parser')
const NormalModuleFactory = require('./NormalModuleFactory')

const { Tapable, SyncHook } = require('tapable')

// 实例化 NormalModuleFactory parser
const normalModuleFactory = new NormalModuleFactory()
const parser = new Parser()

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
        this.createModule({
            parser,
            name,
            context, 
            rawRequest: entry,
            resource: path.posix.join(context, entry), // 当前操作的核心作用就是返回 entry 的绝对路径   
            moduleId: './' + path.posix.relative(context, path.posix.join(context, entry))
        }, (entryModule) => {
            this.entries.push(entryModule)
        }, callback)
    }

    /**
     * 定义一个创建模块的方法，达到复用目的
     * @param {*} data 创建模块需要的属性值
     * @param {*} doAddEntry 可选参数，在加载入口模块的时候，将入口模块的 id 写入 this.entries
     * @param {*} callback 
     */
    createModule(data, doAddEntry, callback) {
        let module = normalModuleFactory.create(data)

        const afterBuild = (err, module) => {
            // 在 afterBuild 当中需要判断一下，当前 module 加载完成之后是否需要处理加载依赖
            if (module.dependencies.length > 0) {
                // 当前逻辑表示module 有需要依赖加载模块，可以单独定一个方法实现
                this.processDependencies(module, (err) => {
                    callback(err, module)
                })
            } else {
                callback(err, module)
            }
        }

        this.buildModule(module, afterBuild)

        // 当我们完成了本次的 build 操作之后将 module 进行保存
        doAddEntry && doAddEntry(module)
        this.modules.push(module)
    }

    /**
     * 完成 build 行为
     * @param {*} module 当前需要被 build 的模块
     * @param {*} callback 
     */
    buildModule(module, callback) {
        module.build(this, (err) => {
            // 如果代码走到这里意味着当前 module 编译完成
            this.hooks.succeedModule.call(module)
            callback(err, module)
        })
    }

    processDependencies(module, callback) {
        // 1 实现一个被依赖模块的递归加载
        // 2 加载模块的思想都是创建一个模块，然后想办法将加载的模块内容拿进来
        // 3 当前我们不知道 module 需要加载几个模块，此时我们需要想办法让所有的被依赖模块都加载完之后再执行 callback ? [neo-async]
    }
}

module.exports = Compilation