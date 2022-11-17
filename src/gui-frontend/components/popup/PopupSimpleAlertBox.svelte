<script lang='ts'>
  import { Button } from "@paperdave/ui";

  export let message = "Input";
  export let buttonLabel = "Ok";
</script>

<layout-flex gap class='root'>
  <p>
    {message}
  </p>
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
