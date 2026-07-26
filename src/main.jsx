import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 云控台浅色蓝：设计令牌见 docs/superpowers/specs/2026-07-26-layout-style-redesign-design.md
          colorPrimary: '#2f54eb',
          borderRadius: 8,
          colorBgLayout: '#f5f7fa',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorderSecondary: '#e5e9f0',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            headerHeight: 56,
            headerPadding: '0 16px',
          },
          Menu: {
            itemSelectedBg: '#eef2ff',
            itemSelectedColor: '#2f54eb',
            itemColor: '#64748b',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
)
