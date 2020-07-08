const express = require('express');
const fetch = require('node-fetch');

const app = express();

const port = 8080;
const baseURL = process.env.ORDERS_HOST;

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/static/index.html`);
});

io.on('connection', (socket) => {
  console.log('a user connected');

  let url = `${baseURL}/stores`;
  fetch(url).then((res) => res.json()).then((json) => {
    console.log('got stores from', url);
    socket.emit('connected', json);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('get orders', (msg) => {
    url = `${baseURL}/orders?storeName=${msg}`;
    fetch(url).then((res) => res.json()).then((json) => {
      console.log('got orders from', url);
      socket.emit('orders', json);
    });
  });

  socket.on('get geofences', (msg) => {
    url = `${baseURL}/geofences?storeName=${msg}`;
    fetch(url).then((res) => res.json()).then((json) => {
      console.log('got geofences from', url);
      socket.emit('geofences', json);
    });
  });
});

http.listen(port, () => {
  console.log(`socker server listening on *:${port}`);
});
