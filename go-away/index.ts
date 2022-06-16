import { Router } from "express"
import { get_last_access, register_access, last_day_acess_count } from "./access"

export let router = Router()
export const route = '/go_away'

router.get('/', async (req, res) => {
    let last_access = await get_last_access()
    let host = req.ip

    await register_access(host)

    res.json({
        last: last_access?.time,
        wasUser: last_access?.host === host,
        count: await last_day_acess_count()
    })
})

export const socket_handlers = []