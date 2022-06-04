const { socketIO } = require("socket.io")
const { hrtime } =  require("process")
const { Sequelize, DataTypes } = require("sequelize")
const express = require("express")

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres"
})
const io = socketIO(server)

const Entry = sequelize.define('User', {
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


async function get_host_latency(host) {
    let entry = await Entry.findOne({
        where: {
            "host": host
        }
    })
    return entry === null ? 0 : entry.latency
}

async function set_host_latency(host, latency) {
    let entry = await Entry.findOne({
        where: {
            "host": host
        }
    })
    if(entry === null) {
        entry = await Entry.create({
            host: host,
            latency: latency
        })
    } else {
        if(latency > entry.latency) {
            entry.latency = latency
            await entry.save()

            let entries = await Entry.findAll()
            io.local.emit('leaderboard', entries.map(e => ({
                host: e.host,
                latency: e.latency
            })))
        }
    }
    return entry
}

async function register_measure(socket) {
    let lastMeasure;
    let lastPing;
    socket.conn.on("packet", ({data}) => {
        if(typeof data === 'string' && data.includes("pongMeasure")) {
            lastMeasure = Number(hrtime.bigint() - lastPing) / 1e6
            socket.emit("latency", lastMeasure)
            set_host_latency(socket.id, lastMeasure)
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
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});