    const ejs = require('ejs')
const path = require('path')
const async = require('neo-async')
const Parser = require('./Parser')
const NormalModuleFactory = require('./NormalModuleFactory')
const Chunk = require('./Chunk')

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
        this.chunks = [] // 存放当前次打包过程所产生的 chunks
        this.assets = []
        this.files = []
        this.hooks = {
            succeedModule: new SyncHook(['module']),
            seal: new SyncHook(),
            beforeChunks: new SyncHook(),
            afterChunks: new SyncHook()
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
        let dependencies = module.dependencies
        async.forEach(dependencies, (dependency, done) => {
            this.createModule({
                name: dependency.name,
                context: dependency.context,
                rawRequest: dependency.rawRequest,
                moduleId: dependency.moduleId,
                resource: dependency.resource,
                parser
            }, null, done)
        }, callback)
    }

    seal(callback) {
        this.hooks.seal.call()
        this.hooks.beforeChunks.call()
        // 01 当前所有的入口模块都被存放在了 compilation 对象的 entries 数组里
        // 02 所谓封装 chunk 指的就是依据某个入口，然后找到他的所有依赖，将他们的源代码放在一起，之后再做合并
        for (const  entryModule of this.entries) {
            // 核心：创建模块 加载已有模块的内容 同时记录模块信息
            const chunk = new Chunk(entryModule)
            // 保存
            this.chunks.push(chunk)
            // 给 chunk 的属性赋值
            chunk.modules = this.modules.filter(module => module.name === chunk.name)
        }

        // chunk 流程梳理之后就进入到 chunk 代码处理环节  （模版文件+模块中的源代码）=》 chunk.js
        this.hooks.afterChunks.call(this.chunks)

        // 生成代码内容
        this.createChunkAssets()

        callback()
    }

    createChunkAssets() {
        for(let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i]
            const fileName = chunk.name + '.js'
            chunk.files.push(fileName)
            // 01 获取模板文件的路径
            let tempPath = path.posix.join(__dirname, 'template/main.ejs')
            // 02 读取模块内容中的代码
            // 生成具体的 chunk 内容
            let tempCode = this.inputFileSystem.readFileSync(tempPath, 'utf8')
            // 03 获取渲染函数
            let tempRender = ejs.compile(tempCode)
            // 04 按照 ejs 的语法渲染数据
            let source = tempRender({
                entryModuleId: chunk.entryModule.moduleId,
                modules: chunk.modules
            })
            
            // 输出文件
            this.emitAssets(fileName, source)
        }
    }

    emitAssets(fileName, source) {
        this.assets[fileName] = source
        this.files.push(fileName)
    }
}

module.exports = Compilation