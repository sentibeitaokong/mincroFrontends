System.register(['shared-store'], function (_export) {
    var store;

    return {
        setters: [
            function (module) {
                store = module;
            }
        ],
        execute: function () {
            _export('mount', function (container, props) {
                var summary = store.getSummary();

                container.innerHTML =
                    '<div class="micro-header">' +
                    '  <div>' +
                    '    <h3>经营看板</h3>' +
                    '    <p>由 dashboard 子应用渲染，数据来自共享依赖 ' + store.version + '。</p>' +
                    '  </div>' +
                    '  <span class="badge">mounted from ' + props.from + '</span>' +
                    '</div>' +
                    '<div class="metric-grid">' +
                    '  <div class="metric"><span>销售额</span><strong>' + store.formatCurrency(summary.revenue) + '</strong></div>' +
                    '  <div class="metric"><span>订单数</span><strong>' + summary.orders + '</strong></div>' +
                    '  <div class="metric"><span>转化率</span><strong>' + summary.conversion + '%</strong></div>' +
                    '</div>' +
                    '<div class="table-wrap">' +
                    '  <table>' +
                    '    <thead><tr><th>模块</th><th>职责</th><th>加载方式</th></tr></thead>' +
                    '    <tbody>' +
                    '      <tr><td>Host Shell</td><td>路由、生命周期、容器</td><td>首屏加载</td></tr>' +
                    '      <tr><td>Dashboard</td><td>经营指标 UI</td><td>System.import 按需加载</td></tr>' +
                    '      <tr><td>Shared Store</td><td>共享状态和工具函数</td><td>依赖注入</td></tr>' +
                    '    </tbody>' +
                    '  </table>' +
                    '</div>';
            });

            _export('unmount', function (container) {
                container.innerHTML = '';
            });
        }
    };
});
