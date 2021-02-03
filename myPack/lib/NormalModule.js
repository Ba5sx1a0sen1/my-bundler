class NormalModule {
    constructor(data) {
        this.name = data.name
        this.entry = data.entry
        this.rawRequest = data.rawRequest
        this.parser = data.parser // 待完成
        this.resource = data.resource 
        this._source // 源代码
        this._ast // 某个模块对应的 ast
    }
}

module.exports = NormalModule