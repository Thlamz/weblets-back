const { Router } = require("express")
const { get_last_access, register_access, last_day_acess_count } = require("./access")

let router = Router()

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


module.exports = {
    socket_handlers: [],
    router: router,
    route: '/go-away'
}