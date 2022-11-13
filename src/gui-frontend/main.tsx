import '@paperdave/ui/base.scss';
import './app.scss';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components-app/App';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <Suspense fallback={'loading'}>
      <App />
    </Suspense>
  </React.StrictMode>
);
