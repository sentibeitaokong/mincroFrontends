(function (global) {
    // 当前 demo 通过动态插入 script 标签加载模块。
    // 模块脚本执行时会同步调用 System.register，这里临时保存那一次注册信息。
    var lastRegister = null;

    // 将加载过程透传给页面上的日志面板；没有日志面板时保持静默。
    function log(message, type) {
        if (typeof global.__MICRO_LOG__ === 'function') {
            global.__MICRO_LOG__(message, type || 'info');
        }
    }

    function MiniSystemJS() {
        // 模块缓存。key 是解析后的绝对 URL，value 保存 exports 和正在加载的 promise。
        this.registry = Object.create(null);
        // 只实现 import map 的 imports 字段，足够覆盖这个 demo 的裸模块名映射。
        this.importMap = {
            imports: Object.create(null)
        };
    }

    // 读取页面中的 <script type="systemjs-importmap">，合并到内部 importMap。
    MiniSystemJS.prototype.initImportMaps = function () {
        var scripts = document.querySelectorAll('script[type="systemjs-importmap"]');

        scripts.forEach(function (script) {
            var parsed = JSON.parse(script.textContent);
            //拷贝依赖地址
            if (parsed.imports) {
                Object.assign(this.importMap.imports, parsed.imports);
            }
        }, this);
    };

    // 将调用方传入的模块 id 解析成真正可请求的 URL。
    MiniSystemJS.prototype.resolve = function (id, parentUrl) {
        var hasImportMapEntry = Object.prototype.hasOwnProperty.call(this.importMap.imports, id);
        var mappedId = hasImportMapEntry ? this.importMap.imports[id] : id;
        // import map 中的地址按页面地址解析；依赖模块里的相对路径按父模块地址解析。
        var baseUrl = hasImportMapEntry ? document.baseURI : parentUrl || document.baseURI;

        if (/^https?:\/\//.test(mappedId) || mappedId.indexOf('blob:') === 0) {
            return mappedId;
        }

        if (mappedId.charAt(0) === '/' || mappedId.indexOf('./') === 0 || mappedId.indexOf('../') === 0) {
            //拼接成绝对路径
            return new URL(mappedId, baseUrl).href;
        }

        throw new Error('无法解析模块：' + id);
    };

    // 供模块文件调用：System.register(['dep'], function (_export) { ... })。
    // 这里只记录声明，真正执行要等依赖都加载完成。
    MiniSystemJS.prototype.register = function (deps, declare) {
        lastRegister = {
            deps: deps,
            declare: declare
        };
    };

    // 加载并执行模块脚本。脚本执行完成后应通过 System.register 留下注册信息。
    MiniSystemJS.prototype.instantiate = function (url) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            log('下载并执行模块 ' + url);
            script.src = url;
            script.async = true;
            script.onload = function () {
                if (!lastRegister) {
                    reject(new Error(url + ' 没有调用 System.register'));
                    return;
                }
                resolve(lastRegister);
                lastRegister = null;
            };
            script.onerror = function () {
                reject(new Error('模块加载失败：' + url));
            };
            document.head.appendChild(script);
        });
    };

    // 完成一个模块的生命周期：实例化、加载依赖、注入依赖导出、执行模块主体。
    MiniSystemJS.prototype.load = function (url) {
        var record = this.registry[url];
        var system = this;

        if (record) {
            log('命中模块缓存 ' + url, 'success');
            return record.promise;
        }

        record = {
            exports: {},
            promise: null
        };
        //模块缓存 动态加载依赖，注入依赖导出并执行
        record.promise = this.instantiate(url).then(function (registration) {
            var deps = registration.deps || [];
            var declaration = registration.declare(function (name, value) {
                // _export(name, value) 写入当前模块的导出对象，供其他模块的 setter 接收。
                record.exports[name] = value;
                log('捕获模块导出 ' + name, 'success');
            });
            var dependencyPromises = deps.map(function (depId) {
                return system.import(depId, url);
            });

            return Promise.all(dependencyPromises).then(function (modules) {
                if (declaration.setters) {
                    // setters 与 deps 一一对应，用依赖模块的 exports 填充当前模块的局部变量。
                    declaration.setters.forEach(function (setter, index) {
                        setter(modules[index]);
                    });
                }

                if (declaration.execute) {
                    declaration.execute();
                }

                return record.exports;
            });
        });

        this.registry[url] = record;
        return record.promise;
    };

    // 对外暴露的入口：System.import('@micro/app-dashboard')。
    MiniSystemJS.prototype.import = function (id, parentUrl) {
        var url = this.resolve(id, parentUrl);
        return this.load(url);
    };

    global.System = new MiniSystemJS();
})(window);
