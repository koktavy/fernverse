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

let players = {
  'type': 'player',
}

wss.on('listening', () => {
  console.log(`Websockets listening on ${process.env.PORT || 8080}`);
})

wss.on('upgrade', function (req, socket, head) {
  wss.handleUpgrade(req, socket, head);
});

wss.on('connection', (client) => {
  console.log('Client connected')
  // Give the new client a unique id, add to the players object
  client.id = uuid()
  players['' + client.id] = {id: client.id}
  // Send the players object to the new client
  client.send(JSON.stringify(players))

  // Process incoming messages from the client
  client.on('message', (message) => {
    const data = JSON.parse(message)
    console.log(data)
  })

  // Handle client disconnection
  client.on('close', () => {
    console.log(`Client ${client.id} disconnected`)
    delete players['' + client.id]
    // client.send(JSON.stringify(players))
  })
})