<script lang='ts'>
  import { Button, TextBox } from "@paperdave/ui";

  export let label = "Input";
  export let placeholder = "";
  export let defaultValue = "";
  export let buttonLabel = "Submit";
  export let message = "";

  let value = defaultValue;
</script>

<layout-flex gap class='root'>
  {#if message}
    <p>
      {message}
    </p>
  {/if}
  <TextBox
    name='value'
    bind:value
    label={label}
    placeholder={placeholder}
    autofocus
  />
  <layout-button-row align='right'>
    <Button type='submit' variant='primary'>
      {buttonLabel}
    </Button>
  </layout-button-row>
</layout-flex>

<style lang='scss'>
  .root {
    width: 400px;
  }
  p {
    margin: 0;
  }
</style>
