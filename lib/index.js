"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var sockjs_1 = __importDefault(require("sockjs"));
var jsx_static_1 = __importDefault(require("jsx-static"));
var path_1 = __importDefault(require("path"));
var memory_fs_1 = __importDefault(require("memory-fs"));
var http_1 = __importDefault(require("http"));
var open_1 = __importDefault(require("open"));
var sockInjection = "\n<script src=\"sockjs.min.js\"></script>\n<script>\nvar sockjs_url = '/echo'\nvar sockjs = new SockJS(sockjs_url)\n\nsockjs.onopen = function() { console.log('opened socket', sockjs.protocol) }\nsockjs.onmessage = function(e) {\n  console.log(e)\n  if(JSON.parse(e.data).msg === \"reload\") location.reload()\n}\nsockjs.onclose = function() { console.log('socket disconnected') }\n</script>\n";
function run(config) {
    var serverFs = new memory_fs_1.default();
    jsx_static_1.default.watch({
        outputFs: serverFs,
        outputDir: "/",
        hooks: {
            postProcess: function (src) { return src + sockInjection; },
            postEmit: function () { return connections.forEach(function (conn) { return conn.emit("data", { msg: "reload" }); }); }
        }
    });
    var echo = sockjs_1.default.createServer({
        prefix: "/echo",
    });
    var server = express_1.default();
    server.use(express_1.default.static(path_1.default.join(path_1.default.dirname(require.resolve("sockjs-client")), "..", "dist")));
    server.get("/*", function (req, res) {
        res.setHeader("Content-Type", "text/html");
        res.send(serverFs.readFileSync(req.path));
    });
    var httpServer = http_1.default.createServer(server);
    var connections = [];
    echo.on('connection', function (conn) {
        connections.push(conn);
        conn.on('data', function (msg) {
            conn.write(JSON.stringify(msg));
        });
    });
    echo.installHandlers(httpServer, {
        prefix: "/echo"
    });
    httpServer.listen(8000, function () { return open_1.default("http://localhost:8000"); });
}
exports.run = run;
