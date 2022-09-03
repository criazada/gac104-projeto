const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const express = require("express");
const path = require("path");

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100)
});

const app = express();

app.use(connectLiveReload());
app.use("/", express.static(path.join(__dirname, "public")));

app.listen(8000);
