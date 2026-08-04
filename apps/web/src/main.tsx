import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import './styles.css';
import './executive-dashboard.css';
import './shift-log.css';
import './rooms.css';
import './tickets.css';
import './groups.css';
import './rooming-import.css';
import './allocation-review.css';
import './auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppRouter /></React.StrictMode>,
);
