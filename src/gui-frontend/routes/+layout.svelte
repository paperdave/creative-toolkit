<script>
  import '@paperdave/ui/base.scss';
  import './app.scss';
  import * as data from '$data';
  import PopupManager from '$components/popup/PopupManager.svelte';
  import { ThemeRoot } from '@paperdave/ui';
  Object.assign(window, { ...data });
</script>

<ThemeRoot primary='#AF7EFF' background='#232030' foreground='#DACAFF'>
  <slot></slot>

  <PopupManager />
</ThemeRoot>
