const { Server } = require("socket.io")
const { hrtime } = require("process")
const { Sequelize, DataTypes } = require("sequelize")
const express = require("express")

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
}
);

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

const io = new Server(server, {
    cors: {
        origin: '*'
    }
})

const Entry = sequelize.define('Entry', {
    host: {
        type: DataTypes.STRING,
        allowNull: false
    },
    latency: {
        type: DataTypes.DOUBLE,
        allowNull: false
    }
}, {});
Entry.sync()

max_cached_entries = 1000
let cached_entries = {

}
async function get_entry(host) {
    if(host in cached_entries) {
        return cached_entries[host]
    }
    
    let entry = await Entry.findOne({
        where: {
            "host": host
        }
    })

    if (Object.keys(cached_entries).length > 1000) {
        delete cached_entries[Object.keys(cached_entries)[0]]
    }
    cached_entries[host] = entry

    return entry
}
async function set_host_latency(host, latency) {
    let entry = await get_entry(host)
    if (entry === null) {
        entry = await Entry.create({
            host: host,
            latency: latency
        })
        io.local.emit('leaderboard', await get_leaderboard())
    } else {
        if (latency > entry.latency) {
            entry.latency = latency
            await entry.save()
            io.local.emit('leaderboard', await get_leaderboard())
        }
    }
    return entry
}
async function get_leaderboard() {
    let entries = await Entry.findAll()
    return entries.map(e => ({
        host: e.host,
        latency: e.latency
    }))
}


async function register_measure(socket) {
    let lastMeasure;
    let lastPing;
    socket.conn.on("packet", (packet) => {
        if (typeof packet.data === 'string' && packet.data.includes("pongMeasure")) {
            lastMeasure = Number(hrtime.bigint() - lastPing) / 1e6
            socket.emit("latency", lastMeasure)
            set_host_latency(socket.handshake.address.address, lastMeasure)
        }
    })

    let interval = setInterval(
        () => {
            socket.send("pingMeasure")
            lastPing = hrtime.bigint()
        }, 500
    )

    socket.on("disconnect", () => {
        clearInterval(interval)
    })
}

io.on('connection', (socket) => {
    console.log('a user connected');
    register_measure(socket)
    get_leaderboard().then((leaderboard) => {
        socket.emit('leaderboard', leaderboard)
    })
});