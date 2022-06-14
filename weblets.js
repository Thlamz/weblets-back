const { socket_handlers: ping_socket_handlers, router: ping_router, route: ping_route } = require("./ping/index.js");
const { socket_handlers: get_away_socket_handlers, router: get_away_router, route: get_away_route } = require("./go-away/index.js");

const socket_handlers = [
    ...ping_socket_handlers,
    ...get_away_socket_handlers
]

const endpoint_routers = [
    [ping_route, ping_router],
    [get_away_route, get_away_router]
]

module.exports = {
    socket_handlers,
    endpoint_routers
}