const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    
    // Handle TypeScript/TSX files - transpile and bundle
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      const result = await Bun.build({
        entrypoints: [`examples/counter${path}`],
        target: "browser",
        format: "esm",
        minify: true,
      });
      
      if (result.success && result.outputs.length > 0) {
        const js = await result.outputs[0].text();
        return new Response(js, {
          headers: { "Content-Type": "application/javascript" }
        });
      } else {
        console.error("Build failed:", result.logs);
        return new Response("Build failed", { status: 500 });
      }
    }

    const file = Bun.file(`examples/counter${path}`);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});

console.log(`Vitrio Counter Demo: http://localhost:3001`);
