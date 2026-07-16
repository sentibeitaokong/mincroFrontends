import { useEffect, useState } from 'react'
import './App.css'

type MicroData = {
  from?: string
  message?: string
  updatedAt?: string
  appName?: string
}

type ChildPayload = {
  from: string
  message: string
  updatedAt: string
  source: string
}

declare global {
  interface Window {
    microApp?: {
      getData?: () => MicroData
      addDataListener?: (listener: (data: MicroData) => void, autoTrigger?: boolean) => void
      removeDataListener?: (listener: (data: MicroData) => void) => void
      dispatch?: (data: ChildPayload) => void
    }
  }
}

const orders = [
  { id: 'JD-24018', buyer: '华东仓配', amount: '¥ 12,480', status: '待审核' },
  { id: 'JD-24021', buyer: '北京零售', amount: '¥ 8,936', status: '配送中' },
  { id: 'JD-24029', buyer: '华南门店', amount: '¥ 19,320', status: '已完成' },
]

const dashboardImage =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"%3E%3Cdefs%3E%3ClinearGradient id="bg" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%23d1fae5"/%3E%3Cstop offset="1" stop-color="%23bfdbfe"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="960" height="540" fill="url(%23bg)"/%3E%3Crect x="96" y="92" width="768" height="356" rx="28" fill="%23ffffff" opacity=".9"/%3E%3Cpath d="M150 366h660" stroke="%23cbd5e1" stroke-width="8" stroke-linecap="round"/%3E%3Crect x="172" y="176" width="84" height="190" rx="14" fill="%2315b8a6"/%3E%3Crect x="302" y="226" width="84" height="140" rx="14" fill="%234ade80"/%3E%3Crect x="432" y="142" width="84" height="224" rx="14" fill="%230f766e"/%3E%3Crect x="562" y="202" width="84" height="164" rx="14" fill="%2338bdf8"/%3E%3Crect x="692" y="118" width="84" height="248" rx="14" fill="%230ea5e9"/%3E%3Ccircle cx="766" cy="188" r="32" fill="%23f59e0b"/%3E%3C/svg%3E'

function App() {
  const [count, setCount] = useState(7)
  const [microData, setMicroData] = useState<MicroData>(() => window.microApp?.getData?.() ?? {})

  useEffect(() => {
    const handleData = (data: MicroData) => setMicroData(data)
    window.microApp?.addDataListener?.(handleData, true)

    return () => {
      window.microApp?.removeDataListener?.(handleData)
    }
  }, [])

  function notifyMain() {
    window.microApp?.dispatch?.({
      from: 'react-app',
      message: `React 子应用已新增订单，当前订单数 ${count}`,
      updatedAt: new Date().toLocaleTimeString(),
      source: '订单工作台',
    })
  }

  return (
    <section className="react-page">
      <header className="app-head">
        <div>
          <p className="eyebrow">React micro app</p>
          <h1>订单工作台</h1>
        </div>
        <div className="head-actions">
          <button type="button" onClick={() => setCount((value) => value + 1)}>
            新增订单 {count}
          </button>
          <button className="ghost-button" type="button" onClick={notifyMain}>
            通知主应用
          </button>
        </div>
      </header>

      <section className="image-card">
        <img src={dashboardImage} alt="订单数据图表" />
        <div>
          <span>图片展示</span>
          <strong>订单履约趋势</strong>
          <small>子应用内部资源展示，可随子应用独立运行。</small>
        </div>
      </section>

      <div className="metric-grid">
        <article>
          <span>今日订单</span>
          <strong>{count}</strong>
        </article>
        <article>
          <span>履约率</span>
          <strong>96.8%</strong>
        </article>
        <article>
          <span>客诉工单</span>
          <strong>3</strong>
        </article>
      </div>

      <section className="message-box">
        <span>主应用消息</span>
        <strong>{microData.message ?? '独立运行中，暂无主应用数据'}</strong>
        <small>{microData.updatedAt ? `来自 ${microData.from}，${microData.updatedAt}` : '访问 3000 端口可查看通信效果'}</small>
      </section>

      <section className="table-card">
        <h2>最近订单</h2>
        <div className="order-list">
          {orders.map((order) => (
            <div className="order-row" key={order.id}>
              <span>{order.id}</span>
              <span>{order.buyer}</span>
              <span>{order.amount}</span>
              <strong>{order.status}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

export default App
