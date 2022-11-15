import '@paperdave/ui/base.scss';
import './app.scss';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components-app/App';
import { uiActiveProjectId } from './state/global-ui';
import { setElectronVersionGlobal } from './state/versions';

const params = new URLSearchParams(window.location.search);

const projectId = params.get('project-id');
if (projectId) {
  uiActiveProjectId.set(projectId);
}

setElectronVersionGlobal(
  params.get('electron-version') ?? 'unknown',
  params.get('node-version') ?? 'unknown'
);

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <Suspense fallback={'loading'}>
      <App />
    </Suspense>
  </React.StrictMode>
);
