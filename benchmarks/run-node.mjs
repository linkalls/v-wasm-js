import http from "http"
import path from "path"
import fs from "fs"
import { stat, readdir } from "fs/promises"
import { performance } from "perf_hooks"
import { chromium } from "playwright"

const VITRIO_PORT = 4001
const SOLID_PORT = 4002
const REACT_PORT = 4003

function resolveAppDir(appName) {
  const cwd = process.cwd()
  const candidates = [path.join(cwd, appName), path.join(cwd, "benchmarks", appName)]
  for (const p of candidates) if (fs.existsSync(p)) return p
  return candidates[0]
}

const vitrioDir = resolveAppDir("vitrio-app")
const solidDir = resolveAppDir("solid-app")
const reactDir = resolveAppDir("react-app")

function serveStatic(dir, port, opts = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`)
      let pathname = url.pathname === "/" ? "/index.html" : url.pathname
      // WASM is now embedded in JS bundle, no special serving needed
      const tryPaths = [
        path.join(dir, "dist", pathname),
        path.join(dir, pathname),
        path.join(dir, "dist", pathname.replace(/^\//, "")),
      ]
      let found = null
      for (const p of tryPaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          found = p
          break
        }
      }
      if (!found) {
        res.writeHead(404)
        res.end("Not found")
        return
      }
      const ext = path.extname(found).toLowerCase()
      const types = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".wasm": "application/wasm",
        ".json": "application/json",
      }
      const ct = types[ext] || "application/octet-stream"
      res.writeHead(200, { "Content-Type": ct })
      fs.createReadStream(found).pipe(res)
    } catch (err) {
      res.writeHead(500)
      res.end(String(err))
    }
  })
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}

async function getFileSizeSafe(p) {
  try {
    const s = await stat(p)
    return s.size
  } catch {
    return 0
  }
}

async function runBenchmark() {
  console.log(`Starting static servers...`)
  const s1 = await serveStatic(vitrioDir, VITRIO_PORT, { vitrio: true })
  const s2 = await serveStatic(path.join(solidDir, "dist"), SOLID_PORT)
  const s3 = await serveStatic(path.join(reactDir, "dist"), REACT_PORT)
  console.log(`Servers running: Vitrio(${VITRIO_PORT}), Solid(${SOLID_PORT}), React(${REACT_PORT})`)

  console.log("Launching browser...")
  const browser = await chromium.launch()
  console.log("Browser launched!")
  const page = await browser.newPage()

  const results = {
    vitrio: { load: 0, interact: 0, listUpdate: 0, size: 0 },
    solid: { load: 0, interact: 0, listUpdate: 0, size: 0 },
    react: { load: 0, interact: 0, listUpdate: 0, size: 0 },
  }

  results.vitrio.size = await getFileSizeSafe(path.join(vitrioDir, "dist", "main.js"))
  try {
    const files = await readdir(path.join(solidDir, "dist", "assets"))
    const jsFile = files.find((f) => f.endsWith(".js"))
    if (jsFile) results.solid.size = await getFileSizeSafe(path.join(solidDir, "dist", "assets", jsFile))
  } catch (e) {
    console.error("Error checking solid assets", e)
  }
  try {
    const files = await readdir(path.join(reactDir, "dist", "assets"))
    const jsFile = files.find((f) => f.endsWith(".js"))
    if (jsFile) results.react.size = await getFileSizeSafe(path.join(reactDir, "dist", "assets", jsFile))
  } catch (e) {
    console.error("Error checking react assets", e)
  }

  async function benchApp(name, url, target) {
    console.log(`\nBenchmarking ${name}...`)
    let totalLoad = 0
    for (let i = 0; i < 5; i++) {
      const start = performance.now()
      await page.goto(url, { waitUntil: "domcontentloaded" })
      if (target !== "vitrio") {
        await page.waitForSelector("#counter", { timeout: 10000 })
      }
      const end = performance.now()
      totalLoad += end - start
    }
    results[target].load = totalLoad / 5
    console.log(`  Load time: ${results[target].load.toFixed(2)}ms`)

    await page.goto(url, { waitUntil: "domcontentloaded" })
    await page.waitForSelector("#counter", { timeout: 10000 })
    if (target === "vitrio") {
      await page.waitForFunction(() => window.__vitrioHydrated === true)
    }
    const startInteract = performance.now()
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"))
      const btn = btns.find((b) => b.textContent && b.textContent.includes("+"))
      if (btn) for (let i = 0; i < 100; i++) btn.click()
    })
    const endInteract = performance.now()
    results[target].interact = endInteract - startInteract
    console.log(`  Interact time: ${results[target].interact.toFixed(2)}ms`)

    const count = await page.locator("#counter").textContent()
    console.log(`  Final count: ${count}`)

    await page.goto(url, { waitUntil: "domcontentloaded" })
    await page.waitForSelector("#counter", { timeout: 10000 })
    if (target === "vitrio") {
      await page.waitForFunction(() => window.__vitrioHydrated === true)
    }
    const startList = performance.now()
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="todo"]')
      const addBtn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Add")
      if (input && addBtn) {
        for (let i = 0; i < 50; i++) {
          input.value = `Todo item ${i}`
          input.dispatchEvent(new Event("input", { bubbles: true }))
          addBtn.click()
        }
        const removeButtons = Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === "×")
        for (let i = 0; i < Math.min(25, removeButtons.length); i++) removeButtons[i].click()
      }
    })
    const endList = performance.now()
    results[target].listUpdate = endList - startList
    console.log(`  List update time: ${results[target].listUpdate.toFixed(2)}ms`)
    const listItems = await page.locator("li").count()
    console.log(`  Final list items: ${listItems}`)
  }

  await benchApp("Vitrio", `http://localhost:${VITRIO_PORT}`, "vitrio")
  await benchApp("Solid", `http://localhost:${SOLID_PORT}`, "solid")
  await benchApp("React", `http://localhost:${REACT_PORT}`, "react")

  console.log("\n=== Results ===")
  console.table(results)

  const vitrioVsSolid = ((results.solid.interact / results.vitrio.interact) * 100 - 100).toFixed(1)
  const vitrioVsReact = ((results.react.interact / results.vitrio.interact) * 100 - 100).toFixed(1)
  const listVitrioVsSolid =
    results.vitrio.listUpdate > 0 && results.solid.listUpdate > 0
      ? ((results.solid.listUpdate / results.vitrio.listUpdate) * 100 - 100).toFixed(1)
      : "N/A"

  const md = `# Benchmark Results

| Metric | Vitrio (WASM) | SolidJS | React |
|--------|---------------|---------|-------|
| Bundle Size (bytes) | ${results.vitrio.size} | ${results.solid.size} | ${results.react.size} |
| Avg Load Time (ms) | ${results.vitrio.load.toFixed(2)} | ${results.solid.load.toFixed(2)} | ${results.react.load.toFixed(2)} |
| Interaction (100 clicks) (ms) | ${results.vitrio.interact.toFixed(2)} | ${results.solid.interact.toFixed(2)} | ${results.react.interact.toFixed(2)} |
| List Update (50 add, 25 remove) (ms) | ${results.vitrio.listUpdate.toFixed(2)} | ${results.solid.listUpdate.toFixed(2)} | ${results.react.listUpdate.toFixed(2)} |

## Performance Comparison

- **Counter (100 clicks)**: Vitrio is ${vitrioVsSolid}% ${Number(vitrioVsSolid) > 0 ? "faster" : "slower"} than Solid, ${vitrioVsReact}% ${Number(vitrioVsReact) > 0 ? "faster" : "slower"} than React
- **List Updates**: Vitrio is ${listVitrioVsSolid}% ${Number(listVitrioVsSolid) > 0 ? "faster" : "slower"} than Solid

*Run on ${new Date().toISOString()}*
`

  await fs.promises.writeFile(path.join(process.cwd(), "results.md"), md)
  console.log("\nResults saved to results.md")

  await browser.close()
  s1.close()
  s2.close()
  s3.close()
  process.exit(0)
}

runBenchmark().catch((err) => {
  console.error("Benchmark error:", err)
  process.exit(1)
})
