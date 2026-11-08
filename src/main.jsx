import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

console.log('Is Tauri?', !!window.__TAURI__);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)