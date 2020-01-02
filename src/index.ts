import express from "express"
import sockjsNode from "sockjs"
import jsxs from "jsx-static"
import path from "path"
import MemoryFileSystem from "memory-fs"
import http from "http"
import open from "open"
import { JsxsConfig } from "jsx-static/lib/config"
import portFinder from "portfinder"


const sockInjection = `
<script src="sockjs.min.js"></script>
<script>
(function() {
  var sockjs_url = '/echo'
  var sockjs = new SockJS(sockjs_url)
  
  sockjs.onopen = function() { console.log('opened socket', sockjs.protocol) }
  sockjs.onmessage = function(e) {
    if(JSON.parse(e.data).msg === "reload") location.reload()
  }
  sockjs.onclose = function() { console.log('socket disconnected') }
})()
</script>
`

export function run(config: JsxsConfig) {
  const serverFs = new MemoryFileSystem()
  
  jsxs.build({
    outputFs: serverFs,
    outputDir: "/",
    hooks: {
      postEmit: () => {
        portFinder.getPort((err, port) => {
          if(err) console.error(err)
          httpServer.listen(port, () => open(`http://localhost:${port}`))
        })
        jsxs.watch({
          outputFs: serverFs,
          outputDir: "/",
          hooks: {
            postProcess: src => src + sockInjection,
            postEmit: () => connections.forEach(conn => conn.emit("data", { msg: "reload" }))
          }
        })
      }
    }
  })

  
  const echo = sockjsNode.createServer({ 
    prefix: "/echo",
  })

  const server = express()
  server.use(express.static(path.join(path.dirname(require.resolve("sockjs-client")), "..", "dist")))
  
  server.get("/*", (req, res) => {
    res.setHeader("Content-Type", "text/html")
    if(serverFs.existsSync(req.path)) res.send(serverFs.readFileSync(req.path))
    else if(serverFs.existsSync(req.path + ".html")) res.send(serverFs.readFileSync(req.path + ".html"))
    else if(serverFs.existsSync(req.path + "index.html")) res.send(serverFs.readFileSync(req.path + "index.html"))
    else if(serverFs.existsSync("/404.html")) res.send(serverFs.readFileSync("404.html"))
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