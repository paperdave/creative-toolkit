Bun.spawn({
  cmd: ['fuscript', '/code/paperdave/creative-toolkit/src/fusion-scripts/render.lua'],
  env: {
    ct_filename: '/project/test/step2/000-250_Composition1.comp',
    ct_ranges: '1..20',
    ct_fusion_uuid: 'fdsa',
  },
  stdio: ['inherit', 'inherit', 'inherit'],
});
