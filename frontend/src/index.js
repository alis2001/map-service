// index.js - React Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css';

// Performance monitoring (optional)
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring
function sendToAnalytics(metric) {
  // You can send metrics to your analytics service here
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Web Vital:', metric);
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
