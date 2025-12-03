import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ResultView from './ResultView.jsx'
import WishListView from './WishListView.jsx'
import PublicWishesView from './PublicWishesView.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/result/:exchangeId" element={<ResultView />} />
        <Route path="/wishes/:exchangeId" element={<WishListView />} />
        <Route path="/view-wishes/:exchangeId" element={<PublicWishesView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
