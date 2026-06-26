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
                var orders = [
                    ['SO-20260625-001', '已支付', store.formatCurrency(1280)],
                    ['SO-20260625-002', '待发货', store.formatCurrency(860)],
                    ['SO-20260625-003', '已完成', store.formatCurrency(2340)]
                ];
                var rows = orders.map(function (order) {
                    return '<tr><td>' + order[0] + '</td><td>' + order[1] + '</td><td>' + order[2] + '</td></tr>';
                }).join('');

                container.innerHTML =
                    '<div class="micro-header">' +
                    '  <div>' +
                    '    <h3>订单中心</h3>' +
                    '    <p>由 orders 子应用渲染，可复用同一个共享模块中的区域和格式化逻辑。</p>' +
                    '  </div>' +
                    '  <span class="badge">' + props.loadedAt + '</span>' +
                    '</div>' +
                    '<div class="metric-grid">' +
                    '  <div class="metric"><span>今日订单</span><strong>' + summary.orders + '</strong></div>' +
                    '  <div class="metric"><span>核心区域</span><strong>' + summary.region + '</strong></div>' +
                    '  <div class="metric"><span>客单价</span><strong>' + store.formatCurrency(Math.round(summary.revenue / summary.orders)) + '</strong></div>' +
                    '</div>' +
                    '<div class="table-wrap">' +
                    '  <table>' +
                    '    <thead><tr><th>订单号</th><th>状态</th><th>金额</th></tr></thead>' +
                    '    <tbody>' + rows + '</tbody>' +
                    '  </table>' +
                    '</div>';
            });

            _export('unmount', function (container) {
                container.innerHTML = '';
            });
        }
    };
});
