# Order Monitor

Order Monitor is a web application (NodeJS) consisting of a near real-time dashboard of customer locations along with their ETAs. The dashboard includes both a map and order queue.

## Prerequisites

- Create a new Map Id and associated style in the Cloud Console. Follow these [instructions](https://developers.google.com/maps/documentation/javascript/cloud-based-map-styling).
- Create a Maps API key. This API key will be used to authenticate the application with the Dynamic Maps and Directions APIs.
- Create another API key. This API key will be used to authenticate the Order Monitor web server (backend) with the GeoAwareness REST API.

## Run Locally

1. Install the version of node that is in `.nvmrc` (optionally use NVM to manage your NodeJS installs)

1. Clone this repo

1. Install the server

   ```
   npm install
   ```

1. Start the server (this will start the mock json server and socket server)...

   ```
   npm run dev
   ```

1. ...or optionally start just the socket server (like you would in production)

   ```
   npm start
   ```

1. Open the site in the browser: http://localhost:8080

## Application design and code structure

- Server code: `index.js`
- Client HTML: `static/index.html` and uses Mustache for inline HTML templating
- Client code: `static/app.js` and uses POJS (Plain Old JavaScript)
- Client UX is done with [Material Design Bootstrap](https://mdbootstrap.com/docs/)
- Most everything else in `static` is from the bootstrap install.

The browser and server both use [socket.io](https://socket.io/) to communicate over WebSockets for a realtime feed of orders.

## Configure application

1. Edit the client-side app config file `static/config/config.json`. The `mapsKey` must have permissions for Google Maps Platform Dynamic Maps API.
   Set `mapIds` to the Map Id created earlier.

1. Edit the webserver (backend) config file `app.yaml`. The `API_KEY` must have permissions for the GeoAwareness REST API.

   Set `ORDERS_HOST` to the GeoAwareness REST API endpoint. Example:

   ```
   ORDERS_HOST: "https://api.geoawareness.woolpert.dev"
   ```

## Deploy to GCP - App Engine

```
gcloud app deploy app.yaml
```

Launch the application. Browse to:

    https://<YOUR_PROJECT_ID>.wm.r.appspot.com # Eg. https://geoawareness-sandbox.wm.r.appspot.com
