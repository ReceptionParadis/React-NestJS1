import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import './styles.css';
import './shift-log.css';
import './rooms.css';
import './tickets.css';
import './groups.css';
import './rooming-import.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppRouter /></React.StrictMode>,
);
