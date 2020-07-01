const express = require('express')
const fetch = require('node-fetch')
const app = express()

const port = 3000
const baseURL = 'https://40f909ca-7e53-4b49-b3a1-64c7e820e6b2.mock.pstmn.io';

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('static'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  fetch(`${baseURL}/stores`).then(res => res.json()).then(json => {
    socket.emit('connected', json);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('get orders', (msg) => {
    const url = `${baseURL}/orders?storeName=${msg}`
    fetch(url).then(res => res.json()).then(json => {
      socket.emit('orders', json);
    });
  });

  socket.on('get geofences', (msg) => {
    const url = `${baseURL}/geofences?storeName=${msg}`
    fetch(url).then(res => res.json()).then(json => {
      socket.emit('geofences', json);
    });
  });
});

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});