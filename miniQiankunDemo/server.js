import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

/** 项目根目录 */
const root = resolve(process.cwd());
/** 服务器端口 */
const port = 7200;

/**
 * MIME 类型映射表
 * 根据文件扩展名返回对应的 Content-Type
 */
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

/**
 * 发送文件响应
 * @param {object} res       HTTP 响应对象
 * @param {string} filepath  文件路径
 */
function sendFile(res, filepath) {
  res.writeHead(200, {
    // 允许跨域访问 —— 主应用需要 fetch 子应用的 HTML、JS、CSS
    "Access-Control-Allow-Origin": "*",
    "Content-Type": mimeTypes[extname(filepath)] || "application/octet-stream",
  });
  createReadStream(filepath).pipe(res);
}

/**
 * 创建 HTTP 服务器
 *
 * 请求处理逻辑：
 * 1. 解析请求 URL 的路径名
 * 2. 路径安全处理，防止目录遍历攻击
 * 3. 如果请求根路径 "/"，返回主应用的 index.html
 * 4. 如果请求的文件存在，返回该文件
 * 5. 如果文件不存在，回退到主应用的 index.html（支持 SPA 路由）
 */
createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${port}`);

  // 安全处理：去除路径遍历攻击（../），只保留安全的路径部分
  const safePath = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.[/\\])+/,
    "",
  );

  // 根路径 "/" → 返回主应用；否则查找对应文件
  const filepath =
    safePath === "/" ? join(root, "main/index.html") : join(root, safePath.slice(1));

  if (existsSync(filepath)) {
    sendFile(res, filepath);
    return;
  }

  // 文件不存在时回退到主应用 index.html（SPA 路由支持）
  sendFile(res, join(root, "main/index.html"));
}).listen(port, "0.0.0.0", () => {
  console.log(`mini qiankun demo: http://localhost:${port}`);
});
