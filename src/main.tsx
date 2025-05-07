
import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

/**
 * Shop Spot Check Daily Application
 * Conceived and developed by Elton Niati (eaglevision.dev30@gmail.com)
 * Copyright © 2025
 */

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
