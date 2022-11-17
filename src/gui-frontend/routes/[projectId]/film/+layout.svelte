<script lang='ts'>
  import { activeFilmShotList, activeProject, guiActionCreateFilmShot } from '$data';
  import { promptNumber, promptString } from '$components/popup';
  import day from 'dayjs';

  import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
  import { Button } from '@paperdave/ui';
  import { goto } from '$app/navigation';

  function formatTimecode(seconds: number) {
    return day(seconds * 1000).format('mm:ss') + '.' + (seconds % 1).toFixed(2).slice(2);
  }

  async function addById() {
    const id = await promptString({
      title: 'Add shot by ID + Range',
      message: 'Enter Shot ID',
      buttonLabel: 'OK',
      defaultValue: uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: '_',
      }),
    });
    if (!id) return;
    const start = await promptNumber({
      title: 'Add shot by ID + Range',
      message: 'Enter Start in Frames',
      buttonLabel: 'OK',
      defaultValue: 0,
    });
    if (start == null) return;
    const end = await promptNumber({
      title: 'Add shot by ID + Range',
      message: 'Enter End in Frames',
      buttonLabel: 'OK',
      defaultValue: 0,
    });
    if (end == null) return;
    guiActionCreateFilmShot($activeProject.id, { id, start, end });
  }
</script>

<div class="split_h">
  <div class='shots'>
    <Button on:click={addById}>Add Shot</Button>
    <Button on:click={() => goto(`/${$activeProject.id}/film/freeform`)}>Freeform</Button>
    <br>
    {#each $activeFilmShotList.sort((a, b) => a.start - b.start) as shot (shot.id)}
      <Button on:click={() => goto(`/${$activeProject.id}/film/${shot.id}`)}>
        <div class='shot'>
          <h2>{shot.id} ({shot.takeCount} take{shot.takeCount !== 1 ? 's' : ''})</h2>
          <div>
            {formatTimecode(shot.start / 60)} - {formatTimecode(shot.end / 60)} ({((shot.end - shot.start) / 60).toFixed(2)} seconds)
          </div>
          <div>
            {day(shot.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </div>
      </Button>
    {/each}
  </div>
  <div>
    <slot></slot>
  </div>
</div>

<style lang='scss'>
  .split_h {
    display: flex;
    flex-direction: row;
    height: 100%;
    flex: 1;
  }
  .shots {
    background-color: #ddd;
    flex: 0 0 28rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .shot {
    display: flex;
    flex-direction: column;
    margin: 10px 0;

    h2 {
      margin: 0;
    }
  }
</style>
