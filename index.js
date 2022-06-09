const { Server } = require("socket.io")
const { hrtime } = require("process") 
const express = require("express")
const { get_entry, create_entry, set_entry_latency, get_leaderboard } = require("db")

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

async function register_measure(socket) {
    let lastMeasure;
    let lastPing;
    let host = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress

    let entry = await get_entry(host)
    if(!entry) {
        entry = await create_entry(host)
    }

    socket.emit("nickname", entry.nickname)

    let interval
    let pingFunction = () => {
        socket.send("pingMeasure")
        lastPing = hrtime.bigint()
    }
    interval = setTimeout(pingFunction, 500)

    socket.on("disconnect", () => {
        if(interval) {
            clearTimeout(interval)
        }
    })

    socket.conn.on("packet", async (packet) => {
        if (typeof packet.data === 'string' && packet.data.includes("pongMeasure")) {
            lastMeasure = Number(hrtime.bigint() - lastPing) / 1e6
            socket.emit("latency", lastMeasure)
            interval = setTimeout(pingFunction, 500)
            if(await set_entry_latency(host, lastMeasure)) {
                io.local.emit('leaderboard', await get_leaderboard())
            }
        }
    })
}

io.on('connection', (socket) => {
    register_measure(socket)
    get_leaderboard().then((leaderboard) => {
        socket.emit('leaderboard', leaderboard)
    })
});