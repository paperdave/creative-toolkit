import cx from 'clsx';
import { uiActiveTab, UITabType } from '../state/global-ui';

export function TabBar() {
  return (
    <div>
      <Tab id='info'>Info</Tab>
      <Tab id='clips'>Clips</Tab>
      <Tab id='film'>Film</Tab>
    </div>
  );
}

function Tab({ id, children }: { id: UITabType; children: React.ReactNode }) {
  const [tab, set] = uiActiveTab.usePair();
  const active = tab === id;
  const onClick = () => set(id);

  return (
    <button //
      className={cx('tab', { active })}
      onClick={onClick}
      disabled={active}>
      {children}
    </button>
  );
}
