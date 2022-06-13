const sequelize = require("../db.js")
const { DataTypes, Op } = require("sequelize")

// Acess registry model
const Access = sequelize.define('Access', {
    host: {
        type: DataTypes.STRING,
        allowNull: false
    },
    time: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {});
Access.sync()

let cached_last_access = null
async function get_last_access() {
    if(cached_last_access != null) {
        return cached_last_access
    }
    return await Access.findOne({
        order: [
            ['time', 'DESC']
        ]
    })
}

async function last_day_acess_count() {
    let today = new Date()
    today.setHours(today.getHours() - 24)

    return await Access.count({
        where: {
            time: {
                [Op.gte]: today
            }
        }
    })
}

const max_saved_accesses = 100
async function register_access(host) {
    if(Access.count() > max_saved_accesses) {
        let oldest = await Access.findOne({
            order: [
                ['createdAt', 'ASC']
            ]
        })
        await oldest.destroy()
    }
    let time = new Date()
    let access = await Access.create({
        host,
        time
    })
    cached_last_access = access
    return access
}

module.exports = {
    get_last_access,
    register_access,
    last_day_acess_count
}