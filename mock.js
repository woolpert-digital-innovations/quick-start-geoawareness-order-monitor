const express = require('express')
const fs = require('fs');
const app = express()

const port = 3000

function get(name) {
  let obj = fs.readFileSync(`./mocks/${name}.json`, {encoding:'utf8', flag:'r'});
  return JSON.parse(obj);
}

app.get('/stores', (req, res) => {
  res.json(get('stores'));
});

app.get('/orders', (req, res) => {
  res.json(get('orders'));
});

app.get('/geofences', (req, res) => {
  res.json(get('geofences'));
});

const http = require('http').createServer(app);

http.listen(port, () => {
  console.log(`mock server listening on *:${port}`);
});