import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { MainCourante } from './MainCourante';
import './styles.css';

const page = window.location.pathname === '/main-courante' ? <MainCourante /> : <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{page}</React.StrictMode>,
);
