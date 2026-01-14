await Bun.build({
  entrypoints: ['examples/counter/main.tsx'],
  outdir: 'benchmarks/vitrio-app/dist',
  target: 'browser',
  minify: true,
});
console.log("Vitrio build complete.");