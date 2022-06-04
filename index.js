const http = require('http')
const server = http.createServer()
const { Server } = require("socket.io")
const { hrtime } =  require("process")
const { Sequelize, DataTypes } = require("sequelize")

const sequelize = new Sequelize(process.env.DATABASE_URL)
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

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

function set_host_latency(host, latency) {
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

function register_measure(socket) {
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