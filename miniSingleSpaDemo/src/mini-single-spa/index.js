import { registerApplication } from "./apps.js";
import { patchRoutingEvents } from "./navigation.js";
import { reroute, start } from "./reroute.js";

// 模块初始化时先劫持路由事件，保证后续路由变化都进入 reroute 调度。
patchRoutingEvents(reroute);

export { registerApplication, start };
