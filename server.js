const express = require('express');
const SocketServer = require('ws').Server;

const PORT = process.env.PORT || 3000;

const server = express()
  .use((req, res) => res.send('Hello World!') )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);
