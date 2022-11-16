import { Film } from './Film';
import { Info } from './Info';
import { PromptManager } from './PromptManager';
import { TabBar } from './TabBar';
import { $status } from '../data-sources';
import { uiActiveProjectId, uiActiveTab } from '../state/global-ui';

function openProject() {}

export function App() {
  const status = $status.read();
  const activeProjectId = uiActiveProjectId.use();

  if (activeProjectId) {
    return <ProjectApp />;
  }

  return (
    <div>
      <h1>Welcome to Creative Toolkit v{status.version}</h1>
      <p>
        <em>
          now featuring the <u>two step process</u>!
        </em>
      </p>

      <h2>press the button to open up a project file</h2>
      <button onClick={openProject}>open project</button>

      <h2>stats</h2>
      <pre>
        <code>{JSON.stringify(status, null, 2)}</code>
      </pre>
    </div>
  );
}

export function ProjectApp() {
  const tab = uiActiveTab.use();
  return (
    <>
      <PromptManager />
      <div>
        <TabBar />
        {tab === 'info' ? (
          <Info />
        ) : tab === 'clips' ? (
          <div>clips</div>
        ) : tab === 'film' ? (
          <Film />
        ) : null}
      </div>
    </>
  );
}
