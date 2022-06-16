import sequelize from "../db"
import { DataTypes, Op, Model } from "sequelize"

interface AcessModel extends Model {
    host: String,
    time: Date
}

// Acess registry model
const Access = sequelize.define<AcessModel>('Access', {
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

let cached_last_access: AcessModel | null = null
export async function get_last_access() {
    if(cached_last_access != null) {
        return cached_last_access
    }
    cached_last_access = await Access.findOne({
        order: [
            ['time', 'DESC']
        ]
    })
    return cached_last_access
}

export async function last_day_acess_count() {
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
export async function register_access(host: string) {
    if((await Access.count()) > max_saved_accesses) {
        let oldest = await Access.findOne({
            order: [
                ['createdAt', 'ASC']
            ]
        })
        if(oldest) {
            await oldest.destroy()
        }
    }
    let time = new Date()
    let access = (await Access.create({
        host,
        time
    }))!
    cached_last_access = access
    return access
}