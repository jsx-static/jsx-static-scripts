#!/usr/bin/env node

import child_process from "child_process"
import path from "path"
import commander from "commander"

const program = new commander.Command("jsxs")

program.command("start")
  .description("starts the dev server in this directory")
  .action(() => {
    require("./scripts/serve.js").run()
  })

program.command("create [name]")
  .description("creates a new jsx-static project")
  .option('-o, --output-dir <string>', "set the output directory for builds", "/build")
  .option('-s, --site-dir <string>', "set the input directory for pages", "/site")
  .option('-d, --data-dir <string>', "set the input directory for data", "/data")
  .option('-c, --component-dir <string>', "set the input directory for components", "/components")
  .option('-a, --asset-dir <string>', "set the input driectory for assets", "/assets")
  .option('-e, --data-entry <string>', "set the entry file for data", "index.js")
  .action((name, opts) => {
    const createDir = path.resolve(name || ".")
    
    require("./scripts/create.js").run(createDir, {
      outputDir: opts.outputDir,
      siteDir: opts.siteDir,
      componentDir: opts.componentDir,
      dataDir: opts.dataDir,
      assetDir: opts.assetDir,
      dataEntry: opts.dataEntry,
    })
  })

program.command("build").action(() => {
  require("./scripts/build").run()
})

program.parse(process.argv)