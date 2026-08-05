import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import './styles.css';
import './executive-dashboard.css';
import './shift-log.css';
import './tickets.css';
import './groups.css';
import './rooming-import.css';
import './auth.css';
import './meeting-rooms.css';
import './restaurant-planning.css';
import './interservice.css';
import './weekly-planning.css';
import './interservice-control.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppRouter /></React.StrictMode>,
);
