import { Router } from "express"
import { Server, Socket } from "socket.io"

import { socket_handlers as ping_socket_handlers, router as ping_router, route as ping_route } from"./ping/index";
import { socket_handlers as go_away_socket_handlers, router as go_away_router, route as go_away_route } from "./go-away/index"

export type SocketHandler = (io: Server, socket: Socket) => Promise<void>

export type EndpointRouter = [string, Router]


export const socket_handlers: Array<SocketHandler> = [
    ...ping_socket_handlers,
    ...go_away_socket_handlers
]

export const endpoint_routers: Array<EndpointRouter> = [
    [ping_route, ping_router],
    [go_away_route, go_away_router]
]