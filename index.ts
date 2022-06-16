import { Server } from "socket.io"
import express from "express"
import cors from "cors"
import { socket_handlers, endpoint_routers } from "./weblets"

const PORT = process.env.PORT || 3000;

const server = express()
server.use(cors({origin: '*'}))

const http = server.listen(PORT, () => console.log(`Listening on ${PORT}`));
const io = new Server(http, {
    cors: {
        origin: '*'
    }
})

io.on('connection', (socket) => {
    for(let handler of socket_handlers) {
        handler(io, socket)
    }
})

for(let [route, router] of endpoint_routers) {
    server.use(route, router)
}
