const {
    Tapable,
    AsyncSeriesHook,
    SyncBailHook,
    SyncHook,
    AsyncParallelHook,
} = require('tapable')
const path = require('path')
const mkdirp = require('mkdirp')
const Compilation = require('./Compilation')
const NormalModuleFactory = require('./NormalModuleFactory')
const Stats = require('./Stats')
const { mkdir } = require('fs')
class Compiler extends Tapable {
    constructor(context) {
        super()
        this.context = context
        // 挂载一系列的 Tapable 钩子
        this.hooks = {
            done: new AsyncSeriesHook(['stats']),
            entryOption: new SyncBailHook(['context', 'entry']),

            beforeRun: new AsyncSeriesHook(['compiler']),
            run: new AsyncSeriesHook(['compiler']),

            thisCompilation: new SyncHook(['compilation', 'params']),
            compilation: new SyncHook(['compilation', 'params']),
            
            beforeCompile: new AsyncSeriesHook(['params']),
            compile: new SyncHook(['params']),
            make: new AsyncParallelHook(['compilation']),
            afterCompile: new AsyncSeriesHook(['compilation']),

            emit: new AsyncSeriesHook(['compilation'])
        }
    }

    emitAssets(compilation, callback) {
        // 当前需要做的核心： 创建 dist 在目录创建完成之后执行文件的写操作
        // 01 定一个工具方法用于执行文件的生成操作
        const emitFiles = (err) => {
            const assets = compilation.assets
            let outputPath = this.options.output.path // 拿到输出目录

            for (let file in assets) {
                let source = assets[file]
                let targetPath = path.posix.join(outputPath, file)
                this.outputFileSystem.writeFileSync(targetPath, source, 'utf8')
            }

            callback(err)
        }

        // 创建目录之后启动文件写入
        this.hooks.emit.callAsync(compilation, (err) => {
            mkdirp.sync(this.options.output.path)
            emitFiles()
        })
    }

    run(callback) {
        console.log('执行 run 方法~~~~~~')
        const finalCallback = function(err, stats) {
            callback(err, stats)
        }

        const onCompiled = (err, compilation) => {
            // 最终在这里将处理好的 chunk 写入到指定的文件后 输出到 dist 目录
            this.emitAssets(compilation, (err) => {
                let stats = new Stats(compilation)
                finalCallback(err, stats)
            })
        }
        
        this.hooks.beforeRun.callAsync(this, (err) => {
            this.hooks.run.callAsync(this, (err) => {
                this.compile(onCompiled)
            })
        })
    }

    compile(callback) {
        const params = this.newCompilationParams()
        this.hooks.beforeRun.callAsync(params, (err) => {
            this.hooks.compile.call(params)
            const compilation = this.newCompilation(params)

            this.hooks.make.callAsync(compilation, (err) => {
                // console.log('make钩子监听触发了~~~')
                // callback(err, compilation) // onCompiled

                // 在这里我们开始处理 chunk
                compilation.seal((err) => {
                    this.hooks.afterCompile.callAsync(compilation, (err) => {
                        callback(err, compilation)
                    })
                })
            })
        })
    }

    newCompilationParams() {
        const params = {
            normalModuleFactory: new NormalModuleFactory()
        }
        return params
    }

    newCompilation(params) {
        const compilation = this.createCompilation()
        this.hooks.thisCompilation.call(compilation, params)
        this.hooks.compilation.call(compilation, params)
        return compilation
    }

    createCompilation() {
        return new Compilation(this)
    }
}

module.exports = Compiler