import express from "express"
import sockjsNode from "sockjs"
import jsxs from "jsx-static"
import path from "path"
import mfs from "memfs"
import http from "http"
import open from "open"
//@ts-ignore // for some reason this isn't happy
import { JsxsConfig } from "jsx-static/lib/config"
import portFinder from "portfinder"
import clear from "clear"

const sockInjection = `
<script src="sockjs.min.js"></script>
<script>
  (function() {
    var sockjs_url = '/echo'
    var sockjs = new SockJS(sockjs_url)
    
    sockjs.onopen = function() { console.log('opened socket', sockjs.protocol) }
    sockjs.onmessage = function(e) {
      let data = JSON.parse(e.data)
      if(data.msg === "reload") location.reload()
      else if(data.msg === "error") {
        let errText = document.createElement("p")
        errText.style.fontFamily = "monospace"
        document.body.appendChild(errText)
      }
    }
    sockjs.onclose = function() { console.log('socket disconnected') }
  })()
</script>
`

export function run(config: JsxsConfig) {
  // const serverFs = new MemoryFileSystem()

  jsxs.watch({
    ...config,
    outputFs: mfs,
    outputDir: "/",
    hooks: {
      postProcess: src => src + sockInjection,
      postSiteEmit: () => {
        if(!httpServer.listening) {
          portFinder.getPort((err, port) => {
            if(err) console.error(err)
            httpServer.listen(port, () => open(`http://localhost:${port}`))
          })
        }
        clear()
        console.log("*********************************")
        console.log("*     compiled successfully     *")
        console.log("*********************************")
        connections.forEach(conn => conn.emit("data", { msg: "reload" }))
      },
      postDataEmit: () => connections.forEach(conn => conn.emit("data", { msg: "reload" }))
    }
  })

  
  const echo = sockjsNode.createServer({ 
    prefix: "/echo",
    log: (severity, msg) => {
      if(severity === "error") {
        console.error(msg)
      }
    }
  })

  const server = express()
  server.use(express.static(path.join(path.dirname(require.resolve("sockjs-client")), "..", "dist")))
  server.use(express.static("./"))
  
  server.get("*", (req, res) => {
    res.type(path.extname(req.path) || "html")
    
    //@ts-ignore
    if(mfs.existsSync(req.path) && mfs.statSync(req.path).isFile()) res.send(mfs.readFileSync(req.path))
    //@ts-ignore
    else if(mfs.existsSync(req.path + ".html") && mfs.statSync(req.path + ".html").isFile()) res.send(mfs.readFileSync(req.path + ".html"))
    //@ts-ignore
    else if(mfs.existsSync(req.path + "index.html") && mfs.statSync(req.path + "index.html").isFile()) res.send(mfs.readFileSync(req.path + "index.html"))
    //@ts-ignore
    else if(mfs.existsSync("/404.html") && mfs.statSync("/404.html").isFile()) res.send(mfs.readFileSync("404.html"))
    else res.send("nice happy 404") //TODO: create a nice default 404 page
  })
  
  const httpServer = http.createServer(server)
  
  let connections = []

  echo.on('connection', conn => {
    connections.push(conn)
    conn.on('data', msg => {
      conn.write(JSON.stringify(msg))
    })
  })

  echo.installHandlers(httpServer, {
    prefix: "/echo"
  })
}