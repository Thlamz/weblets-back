const { Server } = require("socket.io")
const express = require("express");
const setup_ping = require("./ping");

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = new Server(server, {
    cors: {
        origin: '*'
    }
})

setup_ping(io)