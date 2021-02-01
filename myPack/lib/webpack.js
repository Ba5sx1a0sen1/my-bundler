const Compiler = require('./Compiler')
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const WebpackOptionApply = require('./WebpackOptionsApply')

const webpack = function (options) {
    // 1. 实例化 compiler 对象
    let compiler = new Compiler(options.context)
    compiler.options = options
    // 2. 初始化 NodeEnvironmentPlugin （使 compiler 具备读写能力）
    new NodeEnvironmentPlugin().apply(compiler)
    // 3. 挂载所有 plugins 插件到 complier 上 (插件实例)
    if (options.plugins && Array.isArray(options.plugins)) {
        for (const plugin of options.plugins) {
            plugin.apply(compiler)
        }
    }
    // 4. 挂载所有 webpack 内置的插件（入口）
    compiler.options = new WebpackOptionApply().process(options, compiler)

    // 5. 返回 compiler 对象即可
    return compiler
}

module.exports = webpack