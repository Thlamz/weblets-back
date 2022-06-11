const sequelize = require("../db.js")
const { DataTypes } = require("sequelize")
const fs = require("fs")

// Leaderboard entry model
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



// Database functions
const names = fs.readFileSync("./identifiers/names/names.txt", {
    encoding: 'utf-8'
}).split(/\r?\n/)
const fruits = fs.readFileSync("./identifiers/surnames/fruit_names.txt", {
    encoding: 'utf-8'
}).split(/\r?\n/)

function get_nickname() {
    let nameIndex = Math.floor(Math.random() * names.length)
    let fruitIndex = Math.floor(Math.random() * fruits.length)

    return names[nameIndex] + " " + fruits[fruitIndex]
}

async function create_entry(host, latency = 0) {
    return await Entry.create({
        host,
        latency: latency,
        nickname: get_nickname()
    })
}

async function get_entry(host) {
    return await Entry.findOne({
        where: {
            host
        }
    })
}


const max_cached_entries = 10000
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

    if (Object.keys(cached_entries).length > max_cached_entries) {
        delete cached_entries[Object.keys(cached_entries)[0]]
    }
    cached_entries[host] = entry.latency

    return entry.latency
}



async function set_entry_latency(host, latency) {
    let currentLatency = await get_entry_latency(host)
    if (currentLatency === null) {
        await create_entry(host, latency)
        return true
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
            return true
        }
    }
    return false
}


async function get_leaderboard() {
    let entries = await Entry.findAll({
        order: [
            ['latency', 'DESC']
        ]
    })
    return entries.map(e => ({
        nickname: e.nickname,
        latency: e.latency
    }))
}



module.exports = {
    create_entry,
    get_entry,
    get_entry_latency,
    set_entry_latency,
    get_leaderboard,
}