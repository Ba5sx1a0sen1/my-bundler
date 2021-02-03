const path = require('path')
const types = require('@babel/types')
const generator = require('@babel/generator').default
const traverse = require('@babel/traverse').default

class NormalModule {
    constructor(data) {
        this.context = data.context
        this.name = data.name
        this.rawRequest = data.rawRequest
        this.parser = data.parser // 待完成
        this.resource = data.resource 
        this._source // 源代码
        this._ast // 某个模块对应的 ast
        this.dependencies = [] // 定义一个空数组 用于保存被依赖加载的模块
    }

    build(compilation, callback) {
        /**
         * 01 从文件中读取到将来要加载的 module 内容，
         * 02 如果当前不是 js 模块则需要 loader 进行处理，最终返回 js 模块
         * 03 上述的操作完成之后就可以将 js 代码转为 ast 语法树
         * 04 当前 js 模块内部可能又引用了很多其他模块，因此我们需要递归完成
         * 05 前面的完成之后，我们只需要重复执行即可
         */
        this.doBuild(compilation, (err) => {
            this._ast = this.parser.parse(this._source)
            // 转换 ast
            traverse(this._ast, {
                CallExpression: (nodePath) => {
                    let node = nodePath.node
                    // 定位 require 所在的节点
                    if (node.callee.name === 'require') {
                        // 获取原始请求路径
                        let modulePath = node.arguments[0].value // './title'
                        // 取出当前被加载的模块名称
                        let moduleName = modulePath.split(path.posix.sep).pop() // 数组最后一项 title
                        // 当前只处理 js
                        let extName = moduleName.indexOf('.') == -1 ? '.js' : ''
                        moduleName += extName // title.js
                        // 读取js的内容 需要处理绝对路径
                        let depResource = path.posix.join(path.posix.dirname(this.resource), moduleName)
                        // 定义当前模块的 id
                        let depModuleId = './' + path.posix.relative(this.context, depResource) // ./src/title.js
                        console.log(depModuleId)
                        // 记录当前被依赖模块的信息， 方便后续递归加载
                        this.dependencies.push({
                            name: this.name, // 需要修改
                            context: this.context,
                            rawRequest: moduleName,
                            moduleId: depModuleId,
                            resource: depResource
                        })
                    }
                }
            })
            callback(err)
        })
    }

    doBuild(compilation, callback) {
        this.getSource(compilation, (err, source) => {
            this._source = source
            callback()
        })
    }

    getSource(compilation, callback) {
        compilation.inputFileSystem.readFile(this.resource, 'utf8', callback)
    }
}

module.exports = NormalModule