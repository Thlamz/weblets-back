const { Server } = require("socket.io")
const express = require("express");
const cors = require("cors");
const { socket_handlers: ping_socket_handlers, router: ping_router, route: ping_route } = require("./ping/index.js");
const { socket_handlers: get_away_socket_handlers, router: get_away_router, route: get_away_route } = require("./go-away/index.js");

const PORT = process.env.PORT || 3000;

const server = express()
server.use(cors({origin: '*'}))

const http = server.listen(PORT, () => console.log(`Listening on ${PORT}`));
const io = new Server(http, {
    cors: {
        origin: '*'
    }
})

const socket_handlers = [
    ...ping_socket_handlers,
    ...get_away_socket_handlers
]

const endpoint_routers = [
    [ping_route, ping_router],
    [get_away_route, get_away_router]
]

io.on('connection', (socket) => {
    for(let handler of socket_handlers) {
        handler(io, socket)
    }
})

for(let [route, router] of endpoint_routers) {
    server.use(route, router)
}
