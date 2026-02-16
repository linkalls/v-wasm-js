const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;

    // SPA fallback: serve index.html for client routes
    if (!path.includes(".") && path !== "/index.html") {
      path = "/index.html";
    }

    // TS/TSX: transpile + bundle
    if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      const result = await Bun.build({
        entrypoints: [`examples/router-demo${path}`],
        target: "browser",
        format: "esm",
        minify: true,
      });

      if (result.success && result.outputs.length > 0) {
        const js = await result.outputs[0].text();
        return new Response(js, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      console.error("Build failed:", result.logs);
      return new Response("Build failed", { status: 500 });
    }

    const file = Bun.file(`examples/router-demo${path}`);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(file);
  },
});

console.log(`Vitrio Router Demo: http://localhost:${server.port}`);
