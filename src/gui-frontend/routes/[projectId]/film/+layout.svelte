<script lang='ts'>
  import { activeFilmShotList } from '$data';
  import day from 'dayjs';

  function formatTimecode(seconds: number) {
    return day(seconds * 1000).format('mm:ss') + '.' + (seconds % 1).toFixed(2).slice(2);
  }
</script>

<div class="split_h">
  <div class='shots'>
    {#each $activeFilmShotList.sort((a, b) => a.start - b.start) as shot (shot.id)}
      <div class='shot'>
        <h2>{shot.id} ({shot.takeCount} take{shot.takeCount !== 1 ? 's' : ''})</h2>
        <div>
          {formatTimecode(shot.start / 60)} - {formatTimecode(shot.end / 60)} ({(shot.end - shot.start) / 60} seconds)
        </div>
        <div>
          {day(shot.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>
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
  }
  .shots {
    background-color: #ddd;
    flex: 0 0 28rem;
  }
  .shot {
    display: flex;
    flex-direction: column;
    border: 1px solid black;
    padding: 10px;
    margin: 10px 0;

    h2 {
      margin: 0;
    }
  }
</style>
