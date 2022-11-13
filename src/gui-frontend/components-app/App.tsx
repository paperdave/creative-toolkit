import { guiActionLoadProject } from '../actions/project';
import { $status } from '../data-sources';
import { $project, $projectList } from '../data-sources/project';

export function App() {
  const meta = $status.read();
  const list = $projectList.read();

  return (
    <div>
      <h1>{meta.message}</h1>
      <p>
        ctk api from {meta.version}, bun {meta.versions.bun}
      </p>
      {list.map(item => (
        <Item key={item.id} id={item.id} />
      ))}
      <button
        onClick={async () => {
          const p = await guiActionLoadProject('/project/test');
        }}>
        go for it
      </button>
    </div>
  );
}

function Item({ id }: { id: string }) {
  const data = $project.read(id);

  return (
    <div>
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
}
