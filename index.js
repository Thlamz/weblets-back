const { Server } = require("socket.io")
const { hrtime } = require("process")
const { Sequelize, DataTypes } = require("sequelize")
const fs = require("fs")
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
    nickname: {
        type: DataTypes.STRING,
        allowNull: true
    },
    latency: {
        type: DataTypes.DOUBLE,
        allowNull: false
    }
}, {});
Entry.sync()

max_cached_entries = 10000
let cached_entries = {}
async function get_entry_latency(host) {
    if(host in cached_entries) {
         return cached_entries[host]
    }
    
    let entry = await Entry.findOne({
        where: {
            "host": host
        }
    })
    if(!entry) {
        return null
    }

    if (Object.keys(cached_entries).length > 10000) {
        delete cached_entries[Object.keys(cached_entries)[0]]
    }
    cached_entries[host] = entry.latency

    return entry.latency
}


names = fs.readFileSync("./identifiers/names/names.txt", {
    encoding: 'utf-8'
}).split(/\r?\n/)
fruits = fs.readFileSync("./identifiers/surnames/fruit_names.txt", {
    encoding: 'utf-8'
}).split(/\r?\n/)

function get_nickname() {
    let nameIndex = Math.floor(Math.random() * names.length)
    let fruitIndex = Math.floor(Math.random() * fruits.length)

    return names[nameIndex] + " " + fruits[fruitIndex]
}

async function set_host_latency(host, latency) {
    let currentLatency = await get_entry_latency(host)
    if (currentLatency === null) {
        entry = await Entry.create({
            host: host,
            latency: latency,
            nickname: get_nickname()
        })
        io.local.emit('leaderboard', await get_leaderboard())
    } else {
        if (latency > currentLatency) {
            let entry = await Entry.findOne({
                where: {
                    "host": host
                }
            })
            entry.latency = latency
            cached_entries[host] = latency
            await entry.save()
            io.local.emit('leaderboard', await get_leaderboard())
        }
    }
    return entry
}
async function get_leaderboard() {
    let entries = await Entry.findAll()
    return entries.map(e => ({
        nickname: e.nickname,
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
            console.log(socket.handshake)
            set_host_latency(socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress, lastMeasure)
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
    register_measure(socket)
    get_leaderboard().then((leaderboard) => {
        socket.emit('leaderboard', leaderboard)
    })
});