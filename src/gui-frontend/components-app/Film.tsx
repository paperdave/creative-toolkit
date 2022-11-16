import day from 'dayjs';
import { promptNumber, promptString } from './PromptManager';
import { guiActionCreateFilmShot } from '../actions/film';
import { readAPFilmShotList } from '../data-sources/film';
import { uiActiveProjectId } from '../state/global-ui';
import { useLoadingState } from '../utils';

function formatTimecode(seconds: number) {
  return day(seconds * 1000).format('mm:ss') + '.' + (seconds % 1).toFixed(2).slice(2);
}

async function addShot() {
  let name: string;
  let start: number;
  let end: number;
  try {
    name = await promptString('shot id');
    if (!name) {
      return;
    }
    start = await promptNumber('shot start');
    end = await promptNumber('shot end');
  } catch (error) {
    return;
  }

  const shot = await guiActionCreateFilmShot(uiActiveProjectId.get()!, {
    id: name,
    start,
    end,
  });
  console.log('created shot', shot);
}

export function Film() {
  const [loading, updateLoadingState] = useLoadingState();

  const filmList = readAPFilmShotList();

  if (!filmList) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}>
        <div
          style={{
            background: '#eee',
            flex: '0 0 28rem',
          }}>
          {loading && <div>loading...</div>}
          <button onClick={() => updateLoadingState(addShot())}>add a new one</button>
          {filmList
            .sort((a, b) => a.start - b.start)
            .map(film => (
              <div
                key={film.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid black',
                  padding: '1rem',
                  margin: '1rem',
                }}>
                <h2 style={{ margin: 0 }}>
                  {film.id} ({film.takeCount} take{film.takeCount !== 1 ? 's' : ''})
                </h2>
                <div>
                  {formatTimecode(film.start / 60)} - {formatTimecode(film.end / 60)} (
                  {((film.end - film.start) / 60).toFixed(1)} seconds)
                </div>
                <div>{day(film.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
