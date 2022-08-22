// Import the modules
const express = require("express");
const https = require("https");
const WebSocket = require('ws');
const fs = require("fs");
const uuid = require('uuid-random');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') })

const PORT = process.env.PORT || 8080;
const options = {
  key: fs.readFileSync("./config/cert.key"),
  cert: fs.readFileSync("./config/cert.crt"),
};

const app = express();
app.use("/", express.static("public"));

// const server = app.listen(PORT, () => {
//   console.log(`Server started on port ${PORT}`);
// });

const httpsServer = https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server started on port ${PORT}`);
});

// const wss = new WebSocket.Server({ server: server })
const wss = new WebSocket.Server({ server: httpsServer })

let players = {}

wss.on('listening', () => {
  console.log(`Websockets listening on ${process.env.PORT || 8080}`);
})

wss.on('connection', (client) => {
  // Give the new client a unique id, add to the players object
  client.id = uuid()
  console.log('Client connected', client.id)
  players[client.id] = {}
  // Send the players object to the new client for reference
  // client.send(JSON.stringify(players))

  // Process incoming messages from the client
  client.on('message', (message) => {
    const data = JSON.parse(message)
    // Process upstream client updates, send downstream to all other players
    if (data.type === 'UPSTREAM_PLAYER_UPDATE') {
      players[client.id] = data.updates
      // console.log(players)
      data.type = 'DOWNSTREAM_PLAYER_UPDATE'
      wss.clients.forEach(function each(otherClient) {
        if (otherClient.readyState !== WebSocket.OPEN) return
        if (otherClient.id === client.id) return
        otherClient.send(JSON.stringify(data))
      })
    } else if (data.type === 'DOWNSTREAM_PLAYER_UPDATE') {
      return
    } else {
      console.log('Unknown message type', message)
    }
  })

  // Handle client disconnection
  client.on('close', () => {
    console.log('This Connection Closed!')
    console.log('Removing Client: ' + client.id)

    // Create a disconnect message
    const message = {
      type: 'PLAYER_DISCONNECT',
      updates: players[client.id]
    }
    // Send to all other clients
    wss.clients.forEach(function each(otherClient) {
      if (otherClient.readyState !== WebSocket.OPEN) return
      if (otherClient.id === client.id) return
      otherClient.send(JSON.stringify(message))
    })

    console.log(`Client ${client.id} left`)
    delete players['' + client.id]
  })
}, {once: true})