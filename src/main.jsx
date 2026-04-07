import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/index.js';
import './styles/global.css';
import { useThemeStore } from './store/themeStore';

// Init theme before render
useThemeStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
