import React from 'react';
import ReactDOM from 'react-dom/client';
import FinBookApp from './FinBookApp';
import './index.css';
import './brand.css';
import './familyDashboard.css';
import { startFamilyGoalInvestmentSync } from './services/familyGoalInvestmentSync';

startFamilyGoalInvestmentSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FinBookApp />
  </React.StrictMode>
);
