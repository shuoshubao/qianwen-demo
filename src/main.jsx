import { ConfigProvider } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ConfigProvider theme={{ token: { colorPrimary: '#722ed1' } }}>
            <App />
        </ConfigProvider>
    </React.StrictMode>
);
