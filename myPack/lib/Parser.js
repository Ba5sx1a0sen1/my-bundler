const babylon = require('babylon')
const { Tapable } = require('tapable')

class Parser extends Tapable {
    parse(source) {
        return babylon.parse(source, {
            sourceType: 'module',
            plugins: ['dynamicImport'] // 当前插件支持 import() 语法
        })
    }
}

module.exports = Parser