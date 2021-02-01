const EntryOptionPlugin = require('./EntryOptionPlugin')

class WebpackOptionApply {
    process(options, compiler) {
        new EntryOptionPlugin().apply(compiler)
        // 调用 hook
        compiler.hooks.entryOption.call(options.context, options.entry)
    }
}

module.exports = WebpackOptionApply