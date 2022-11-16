import path from 'path';
import { guiActionArrangeClips } from '../actions/project';
import { $status, readActiveProject } from '../data-sources';
import { electronVersion, nodeVersion } from '../state/versions';
import { useLoadingState } from '../utils';

export function Info() {
  const [loading, updateLoadingState] = useLoadingState();

  const status = $status.read();
  const project = readActiveProject();

  async function arrange() {
    const clips = await updateLoadingState(guiActionArrangeClips(project!.id));
    // eslint-disable-next-line no-console
    console.log(clips);
  }

  function addAudio() {}

  return (
    <div>
      <h2>Project</h2>
      {project ? (
        <>
          <p>
            <b>id</b>: {String(project.id)} <br />
            <b>name</b>: {String(project.name)} <br />
            <b>root</b>: {String(project.root)} <br />
            <b>isArranged</b>: {String(project.isArranged)}
            {!project.isArranged && (
              <button onClick={arrange} disabled={loading}>
                arrange
              </button>
            )}
            <br />
            <b>hasAudio</b>: {String(project.hasAudio)}
            {!project.hasAudio && (
              <button onClick={addAudio} disabled={loading}>
                add audio
              </button>
            )}
            <br />
          </p>
          <p>
            <b>clips</b>: {String(project.clips.length)} <br />
          </p>
          <p>
            <b>path map:</b>
          </p>
          <table>
            <tbody>
              <tr>
                <td>
                  <b>project root:</b>
                </td>
                <td>
                  <b>{project.root}</b>
                </td>
              </tr>
              {Object.entries(project.paths).map(([key, value]) => {
                const dir = (path.dirname(value) + '/')
                  .replace(/\/\//g, '/')
                  .replace(project.root + '/', './');
                return (
                  <tr key={key}>
                    <td style={{ paddingRight: '20px' }}>{key}</td>
                    <td>
                      {dir}
                      <b>{path.basename(value)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <p>(no active project)</p>
      )}
      <h2>Creative Toolkit</h2>
      <p>
        <b>version</b>: {status.version} <br />
        <b>codename</b>: {status.codename} <br />
        <b>api runtime</b>: bun {status.versions.bun} <br />
        <b>gui runtime</b>: electron {electronVersion}, node {nodeVersion} <br />
      </p>
    </div>
  );
}
