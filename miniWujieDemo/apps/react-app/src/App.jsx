import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [hostMessage, setHostMessage] = useState('等待主应用广播')
  const hostName = window.$wujie?.props?.hostName || '独立运行模式'

  useEffect(() => {
    const handleHostMessage = (message) => {
      if (!message.target || message.target === 'react-app') {
        setHostMessage(`${message.from}：${message.text}`)
      }
    }

    window.$wujie?.bus.$on('host-message', handleHostMessage)
    return () => window.$wujie?.bus.$off('host-message', handleHostMessage)
  }, [])

  function greetHost() {
    if (!window.$wujie) {
      setHostMessage('当前为独立运行模式，未连接主应用')
      return
    }

    window.$wujie.bus.$emit('child-message', {
      from: 'React 子应用',
      text: `计数器当前为 ${count}`,
    })
  }

  return (
    <main className="react-page">
      <div className="grid" aria-hidden="true"></div>
      <section className="hero-card">
        <div className="framework-icon">⚛</div>
        <p className="eyebrow">React 19 子应用</p>
        <h1>你好，{hostName}</h1>
        <p className="intro">这个页面拥有独立的 React 根节点、样式空间和组件状态。</p>

        <div className="status-grid">
          <article>
            <span>运行环境</span>
            <strong>{window.$wujie ? 'Wujie 沙箱' : 'Standalone'}</strong>
          </article>
          <article>
            <span>本地状态</span>
            <strong>{count}</strong>
          </article>
        </div>

        <div className="actions">
          <button className="primary" type="button" onClick={() => setCount((value) => value + 1)}>
            增加计数
          </button>
          <button type="button" onClick={greetHost}>通知主应用</button>
        </div>

        <div className="message">
          <span>来自主应用</span>
          <p>{hostMessage}</p>
        </div>
      </section>
    </main>
  )
}

export default App
