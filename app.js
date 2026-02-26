//import { WebSocketServer } from 'ws';

const PORT = 3000
const hostname = '0.0.0.0'

var config = require('./config.js')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const Docker = require('dockerode')
const docker = new Docker()
const wss = require('ws')
var S2S = require('./S2S.js')
const WS_PORT = 8888
const LOCAL_RS_IP = `127.0.0.1`
const PORT_1 = 9313
const PORT_2 = 9314

const PORT_1_TCP_STR = `${PORT_1}/tcp`
const PORT_2_TCP_STR = `${PORT_2}/tcp`

const PORT_1_STR = PORT_1.toString()
const PORT_2_STR = PORT_2.toString()

if (config.debug) {
  //if we are in debug mode run a websocket server to communicate with server being debugged
  const wsServer = new wss.WebSocketServer({ port: WS_PORT })
  var currentConnection

  wsServer.on('connection', function connection (ws) {
    ws.on('error', console.error)

    ws.on('message', function message (data, isBinary) {
      console.log('Received message: ' + data)
    })

    ws.on('close', function onClose (code, reason) {
      currentConnection = null
      console.log('websocket connection closed')
    })

    console.log('Received websocket connection')
    //send data on connection
    var initS2Scommand = `{"op": "InitS2S", "data": { "appId":"${config.appId}", "serverName":"${config.serverName}", "serverSecret":"${config.serverSecret}"}}`
    console.log('Sending ' + initS2Scommand)
    ws.send(initS2Scommand, (err, obj) => {
      console.log('ws send: ' + err)
      if (obj != null) {
        console.log('ws obj: ' + obj)
      }
    })

    currentConnection = ws
  })

  function assignLobbyToServer (lobbyId) {
    currentConnection.send(
      `{"op": "AssignLobby", "data": { "lobbyId": "${lobbyId}"}}`
    )
  }
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/requestRoomServer', (req, res) => {
  const payload = req.body
  console.log('Received request for room server: ', payload)

  const result = {
    connectInfo: {
      address: LOCAL_RS_IP,
      ports: {
        [PORT_1_TCP_STR]: PORT_1,
        [PORT_2_TCP_STR]: PORT_2
      }
    }
  }

  if (config.debug) {
    //send websocket message to assign lobbyId
    assignLobbyToServer(req.body.id)
  } else {
    startContainer(req.body)
  }

  res.send(result)
})

app.listen(PORT, hostname, () => {
  console.log(`Server listening on ${hostname}:${PORT}`)
})

function startContainer (payload) {
  // debug whats being sent to the container as environment variables
  console.log('Environment variables being sent to container:', payload)

  docker.createContainer(
    {
      Image: config.dockerImage,
      Env: [
        `APP_ID=${config.appId}`,
        `SERVER_NAME=${config.serverName}`,
        `SERVER_SECRET=${config.serverSecret}`,
        `LOBBY_ID=${payload.id}`,
        `LOBBY_TYPE=${payload.lobbyType}`,
        `SERVER_HOST_CX_ID=${payload.ownerCxId}`,
        `CONNECT_DATA=${JSON.stringify(payload.connectData ?? {})}`,

        `PRE_READY_LAUNCH=${payload.lobbyTypeDef.rules.preReadyLaunchEnabled}`,
        `PRL_TIMEOUT_SECS=${600}`,
        `SERVER_ID=TestServer`, // In production this should be a unique identifier for the server instance, such as a guid
        `SERVER_CONTEXT=${JSON.stringify({
          SERVER_TYPE: 'Hosted',
          CONTAINER_KEY: `${payload.id}:${payload.round}`
        }).replace(/"/g, '\\"')}`
      ],
      HostConfig: {
        PortBindings: {
          [PORT_1_TCP_STR]: [{ HostPort: PORT_1_STR }],
          [PORT_2_TCP_STR]: [{ HostPort: PORT_2_STR }]
        }
      },
      ExposedPorts: {
        [PORT_1_TCP_STR]: {},
        [PORT_2_TCP_STR]: {}
      }
    },
    function (err, container) {
      if (err) {
        console.log(err)
      } else {
        container.start(function (err, data) {
          if (err) {
            console.log(err)
          } else {
            console.log(data)
          }
        })
      }
    }
  )
}
