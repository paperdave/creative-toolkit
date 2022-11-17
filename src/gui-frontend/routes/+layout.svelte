<script>
  import '@paperdave/ui/base.scss';
  import './app.scss';
  import * as data from '$data';
  import PopupManager from '$components/popup/PopupManager.svelte';
  import { ThemeRoot } from '@paperdave/ui';
  Object.assign(window, { ...data });
</script>

<ThemeRoot>
  <slot></slot>

  <PopupManager />
</ThemeRoot>
