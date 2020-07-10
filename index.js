const express = require('express');
const fetch = require('node-fetch');

const app      = express();
const port     = 8080;
const baseURL  = process.env.ORDERS_HOST;
const key      = process.env.API_KEY;
const interval = process.env.PULL_INTERVAL_MS || 3000;

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/static/index.html`);
});

io.on('connection', (socket) => {
  console.log('a user connected');

  let url = `${baseURL}/stores?key=${key}`;
  fetch(url).then((res) => res.json()).then((json) => {
    console.log('got stores from', url);
    socket.emit('connected', json);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('get geofences', (msg) => {
    socket.join(`orders/${msg}`); // join the client to the orders for this store
    url = `${baseURL}/geofences?storeName=${msg}&key=${key}`;
    fetch(url).then((res) => res.json()).then((json) => {
      console.log('got geofences from', url);
      socket.emit('geofences', json);
    });
  });
});

// emits orders to all connected sockets
function pullOrders() {
  // Ideally, this should know of all the stores and emit to all namespaces and not Carmelit only
  const url = `${baseURL}/orders?storeName=Carmelit&key=${key}`;
  fetch(url).then((res) => res.json()).then((json) => {
    io.to('orders/Carmelit').emit('orders', json);
  });
}

setInterval(pullOrders, interval);

http.listen(port, () => {
  console.log(`socker server listening on *:${port}`);
});
