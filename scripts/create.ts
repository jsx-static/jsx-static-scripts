import child_process from "child_process"
import path from "path"
import commander from "commander"
import fs from "fs"

import { defaultConfig } from "jsx-static"

function exec(command: string) {
  child_process.execSync(command, { stdio: 'ignore' });
}

// modified from https://github.com/facebook/create-react-app/blob/master/packages/create-react-app/createReactApp.js
function isInGitRepository() {
  try {
    exec('git rev-parse --is-inside-work-tree')
    return true
  } catch (e) {
    return false
  }
}

function isValidDir(dir: string): boolean {
  if(
    !fs.existsSync(dir) || 
    fs.existsSync(path.join(dir, "package.json"))
  ) return false
  
  return true
}

export function run(createDir: string, opts: any) {
  console.log(`creating a new jsx-static project in ${createDir}`)
  console.log()

  if(!fs.existsSync(createDir)) fs.mkdirSync(createDir, { recursive: true })

  if(!isValidDir(createDir)) {
    console.error("package.json cannot already exist in the directory.")
    return
  }

  let packageJSON = {
    name: path.basename(createDir),
    version: "1.0.0",
    description: "A package created by jsxs-static-scripts",
    scripts: {
      "start": "jsxs start",
      "build": "jsxs build",
    },
    private: true,
  }

  if(!fs.existsSync(path.join(createDir, opts.outputDir))) fs.mkdirSync(path.join(createDir, opts.outputDir), {recursive: true})
  if(!fs.existsSync(path.join(createDir, opts.siteDir))) fs.mkdirSync(path.join(createDir, opts.siteDir), {recursive: true})
  if(!fs.existsSync(path.join(createDir, opts.dataDir))) fs.mkdirSync(path.join(createDir, opts.dataDir), {recursive: true})
  if(!fs.existsSync(path.join(createDir, opts.assetDir))) fs.mkdirSync(path.join(createDir, opts.assetDir), {recursive: true})
  if(!fs.existsSync(path.join(createDir, opts.componentDir))) fs.mkdirSync(path.join(createDir, opts.componentDir), {recursive: true})

  const jsxsJSON = { ...opts }

  for(let opt in jsxsJSON) {
    if(jsxsJSON[opt] === defaultConfig[opt]) delete jsxsJSON[opt]
  }
  if(Object.keys(jsxsJSON).length) {
    fs.writeFileSync(path.join(createDir, "jsxs.config.json"), JSON.stringify(jsxsJSON, null, 2))
  }

  fs.writeFileSync(path.join(createDir, ".gitignore"), `
node_modules
${opts.outputDir}
.DS_Store
  `)
  
  if(!isInGitRepository()) {
    console.log("initializing git repository.")
    exec(`git init ${ createDir }`)
  }

  fs.writeFileSync(path.join(createDir, opts.dataDir, opts.dataEntry), `
// this can be any arbitrary data, it will be passed to your pages.
global.jsxsData = {
  greetings: "hello world!"
}
`)

  fs.writeFileSync(path.join(createDir, opts.componentDir, "Html.jsx"), `
export default props => 
<html lang="en">
<head>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
  <link rel="stylesheet" href="${ opts.assetDir }/style/style.scss" />
  <title>{ props.title }</title>
</head>
<body>
  { props.children }
</body>
</html>
`)
  fs.mkdirSync(path.join(createDir, opts.assetDir, "style"), { recursive: true })
  fs.writeFileSync(path.join(createDir, opts.assetDir, "style", "style.scss"), `$background: #1f212a;

* {
  box-sizing: border-box;
}

body {
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(#fff, 0.85);
  background-color: $background;
  overflow: hidden;
  h1 {
    font-size: 3rem;
    font-family: sans-serif;
  }
}
`)

  fs.writeFileSync(path.join(createDir, opts.componentDir, "Html.jsx"), `
export default props => 
<html lang="en">
<head>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
  <link rel="stylesheet" href="assets/style/style.scss" />
  <title>{ props.title }</title>
</head>
<body>
  { props.children }
</body>
</html>
`)

  fs.writeFileSync(path.join(createDir, opts.siteDir, "index.jsx"), `
import Html from "components/Html.jsx"

export default props => 
<Html title="Hello jsx static!">
  <h1>{ props.greetings }</h1>
</Html>
`)
  
  fs.writeFileSync(path.join(createDir, "package.json"), JSON.stringify(packageJSON, null, 2))

  console.log()
  console.log("installing dependencies")
  // needed for npm to work correctly
  fs.mkdirSync(path.join(createDir, "node_modules"))
  console.log(createDir)
  // exec(`cd ${createDir}`)
  child_process.execSync(`npm install jsx-static`, { 
    stdio: 'inherit',
    cwd: createDir
  });

  // console.log("done")
}