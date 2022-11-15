import { Info } from './Info';
import { TabBar } from './TabBar';
import { uiActiveTab } from '../state/global-ui';

export function App() {
  const tab = uiActiveTab.use();
  return (
    <div>
      <TabBar />
      {tab === 'info' ? (
        <Info />
      ) : tab === 'clips' ? (
        <div>clips</div>
      ) : tab === 'film' ? (
        <div>film</div>
      ) : null}
    </div>
  );
}
