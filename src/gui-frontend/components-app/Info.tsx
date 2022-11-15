import { guiActionArrangeClips } from '../actions/project';
import { $status, readActiveProject } from '../data-sources';
import { electronVersion } from '../state/versions';
import { useLoadingState } from '../utils';

export function Info() {
  const [loading, updateLoadingState] = useLoadingState();

  const status = $status.read();
  const project = readActiveProject();

  async function arrange() {
    const clips = await updateLoadingState(guiActionArrangeClips(project!.id));
    console.log(clips);
  }

  function addAudio() {}

  return (
    <div>
      <h2>System</h2>
      <p>
        <b>status</b>: {status.message} <br />
        <b>backend</b>: ct {status.version}, bun {status.versions.bun} <br />
        <b>frontend</b>: electron {electronVersion}, node {status.versions.node}
      </p>
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
        </>
      ) : (
        <p>(no active project)</p>
      )}
    </div>
  );
}
