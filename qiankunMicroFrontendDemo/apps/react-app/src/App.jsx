import { useEffect, useState } from "react";
import "./style.css";

export default function App({ title = "React 子应用", from = "standalone", qiankunActions }) {
  const [state, setState] = useState({
    user: "Guest",
    theme: "light",
  });

  useEffect(() => {
    if (!qiankunActions) {
      return undefined;
    }

    return qiankunActions.onGlobalStateChange((nextState) => {
      setState({
        user: nextState.user,
        theme: nextState.theme,
      });
    }, true);
  }, [qiankunActions]);

  function updateGlobalState() {
    qiankunActions?.setGlobalState({
      user: "ReactUser",
      theme: state.theme === "light" ? "dark" : "light",
      source: "react-app",
    });
  }

  return (
    <section className="react-card">
      <h2>{title}</h2>
      <p>这是 React 子应用，可通过路由注册或 loadMicroApp 手动挂载。</p>
      <dl>
        <dt>来自主应用的 props</dt>
        <dd>{from}</dd>
        <dt>全局用户</dt>
        <dd>{state.user}</dd>
        <dt>全局主题</dt>
        <dd>{state.theme}</dd>
      </dl>
      <button onClick={updateGlobalState}>React 子应用修改全局状态</button>
    </section>
  );
}
