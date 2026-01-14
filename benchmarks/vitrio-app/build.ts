await Bun.build({
  entrypoints: ['../../examples/counter/main.tsx'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
});
console.log("Vitrio build complete.");
