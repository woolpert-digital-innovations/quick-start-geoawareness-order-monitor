This is a NodeJS web server that serves

## Run Locally

1. Install the version of node that is in `.nvmrc` (optionally use NVM to manage your NodeJS installs)

2. Clone this repo

3. Install the server

       npm install

1. Start the server

       npm run dev

1. Open the site in the browser http://localhost:3000

## Develop

Edit these files.  The browser and server both use [socket.io](https://socket.io/) to communicate over WebSockets for a realtime feed of orders.

- Server code is in `index.js`
- Client HTML is in `static/index.html` and uses Mustache for inline HTML templating
- Client code is in `static/js/app.js` and uses POJS (Plain Old JavaScript)
- Client UX is done with [Material Design Bootstrap](https://mdbootstrap.com/docs/)
- Most everything else in `static` is from the bootstrap install.

## Initial Setup (already completed)

1. Get an API Key, authorize it for maps.

1. Did the quickstart at https://mdbootstrap.com/education/bootstrap/quick-start/

1. Tweak static/index.html until you get 2 columns and a 100% height map.

1. Open static/index.html in a browser
