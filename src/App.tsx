import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import ProductsPage from './pages/ProductsPage';
import ProductionPage from './pages/ProductionPage';
import StockPage from './pages/StockPage';
import PromotionsPage from './pages/PromotionsPage';
import ExpiredStockPage from './pages/ExpiredStockPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HelpPage from './pages/HelpPage';
import UsersPage from "./pages/UsersPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
        <Route path="/expired" element={<ExpiredStockPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/manual" element={<HelpPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </Router>
  );
}

export default App;
