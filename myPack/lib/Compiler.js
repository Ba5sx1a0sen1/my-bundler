const {
    Tapable,
    AsyncSeriesHook,
    SyncBailHook,
    SyncHook,
    AsyncParallelHook,
} = require('tapable')

class Compiler extends Tapable {
    constructor(context) {
        super()
        this.context = context
        // 挂载一系列的 Tapable 钩子
        this.hooks = {
            done: new AsyncSeriesHook(['stats']),
            entryOption: new SyncBailHook(['context', 'entry']),
            beforeCompile: new AsyncSeriesHook(['params']),
            compile: new SyncHook(['params']),
            make: new AsyncParallelHook(['compilation']),
            afterCompile: new AsyncSeriesHook(['compilation']),
        }
    }
    run(callback) {
        callback(null, {
            toJson() {
                return {
                    entries: [], // 当前打包的入口信息
                    chunks: [], // 当前打包的 chunk 信息
                    modules: [], // 模块信息
                    assets: [], // 最终打包生成的资源
                }
            }
        })
    }
}

module.exports = Compiler