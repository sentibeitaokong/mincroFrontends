import {registerApplication, start} from "./mini-single-spa/index.js";

function hashPrefix(prefix) {
    return (location) => location.hash.startsWith(prefix);
}
//注册应用
registerApplication({
    name: "home",
    loadApp: () => import("../apps/home.js"),
    activeWhen: hashPrefix("#/home"),
    customProps: {
        domElement: document.getElementById("home-root"),
    },
});

registerApplication({
    name: "orders",
    loadApp: () => import("../apps/orders.js"),
    activeWhen: hashPrefix("#/orders"),
    customProps: {
        domElement: document.getElementById("orders-root"),
    },
});

registerApplication({
    name: "profile",
    loadApp: () => import("../apps/profile.js"),
    activeWhen: hashPrefix("#/profile"),
    customProps: {
        domElement: document.getElementById("profile-root"),
    },
});

if (!window.location.hash) {
    window.location.hash = "#/home";
}
//开始监听
start();
