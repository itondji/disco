import express from 'express'
import { Set } from 'immutable'
import { Server } from 'node:http'
import WebSocket from 'ws'

const ClientTTL = 30_000

export function SignalingServer (httpServer: Server): express.Application {
  const app = express()

  app.on('mount', () => {
    startWebSocketServer(httpServer)
  })

  return app
}

function startWebSocketServer (httpServer: Server) {
  let alives = Set<WebSocket>()

  const wsServer = new WebSocket.Server({
    server: httpServer,
    clientTracking: true
  })

  wsServer.on('connection', (ws) => {
    alives = alives.add(ws)

    ws.on('message', (data, isBinary) =>
      Set(wsServer.clients)
        .filter((c) => c !== ws)
        .filter((c) => c.readyState === WebSocket.OPEN)
        .forEach((c) => c.send(data, { binary: isBinary }))
    )
  })

  const interval = setInterval(() => {
    // clean unresponsive clients
    Set(wsServer.clients)
      .subtract(alives)
      .forEach((ws) => ws.terminate())

    alives = Set()
    wsServer.clients.forEach((ws) => ws.ping())
  }, ClientTTL)

  wsServer.on('close', function close () {
    clearInterval(interval)
  })
}
