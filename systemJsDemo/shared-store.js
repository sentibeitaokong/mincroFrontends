System.register([], function (_export) {
    var state;

    return {
        setters: [],
        execute: function () {
            state = {
                revenue: 128600,
                orders: 248,
                conversion: 12.8,
                region: '华东'
            };

            _export('getSummary', function () {
                return {
                    revenue: state.revenue,
                    orders: state.orders,
                    conversion: state.conversion,
                    region: state.region
                };
            });

            _export('formatCurrency', function (value) {
                return '¥' + Number(value).toLocaleString('zh-CN');
            });

            _export('version', 'shared-store@1.0.0');
        }
    };
});
