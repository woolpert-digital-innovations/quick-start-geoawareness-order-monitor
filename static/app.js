const socket = io();

//
//
// Globals
//
//

let map = null;
const colors = ['#bbdefb', '#2196f3', '#0d47a1', 'grey'];
const geoFences = [];
const stores = [];
const orderGroups = [
  {
    minutes: '2',
    range: 120,
    color: colors[2],
    locations: [],
  },
  {
    minutes: '5',
    range: 300,
    color: colors[1],
    locations: [],
  },
  {
    minutes: '10',
    range: 600,
    color: colors[0],
    locations: [],
  },
  {
    minutes: '>10',
    range: 601,
    locations: [],
  },
];

//
//
// Helper Functions
//
//

function getColor(range) {
  switch (range) {
    case 120:
      return colors[2];
    case 300:
      return colors[1];
    default:
      return colors[0];
  }
}

function loadMap() {
  const location = new google.maps.LatLng(1, 1);

  const options = {
    center: location,
    zoom: 0,
    mapId: '6a9eb25b0d956d9d',
    gestureHandling: 'greedy', // disable the stupid default CTRL required to zoom
  };

  map = new google.maps.Map(document.getElementById('map-container'), options);
}

function renderStores(store) {
  const template = document.getElementById('store-template').innerHTML;
  const rendered = Mustache.render(template, { location: store });
  document.getElementById('stores').innerHTML += rendered;

  const marker = new google.maps.Marker({
    position: {
      lat: store.location.latitude,
      lng: store.location.longitude,
    },
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5,
      strokeColor: '#0d47a1',
      strokeOpacity: 1,
      strokeWeight: 3,
    },
  });
  marker.addListener('click', () => {
    onGetOrders(store.name);
  });
}

function setExtentToStores() {
  // set extent to the store locations
  const bounds = new google.maps.LatLngBounds();
  stores.forEach((store) => {
    const latlng = new google.maps.LatLng(store.location.latitude, store.location.longitude);
    bounds.extend(latlng);
  });
  map.fitBounds(bounds);
}

//
//
// UI Events
//
//

function onGetOrders(id) {
  console.log('Getting orders for ', id);
  socket.emit('get geofences', id);
  socket.emit('get orders', id);
  document.getElementById('nav').classList.remove('invisible');
}

function onNavRange(range) {
  onShowRange(range);
  // move scrollbar down to order group...
}

function onNavStores(id) {
  socket.emit('get orders', id);
  setExtentToStores();
}

function onShowOrder(id) {
  // if order and store distance is <100 ft, zoom to th
  // zoom to extent of order and store
}

function onShowRange(range) {
  // recenter the map to isochrone extents
  let index = 0;
  if (parseInt(range) === 120) {
    index = 2;
  } else if (parseInt(range) === 300) {
    index = 1;
  }

  const bounds = new google.maps.LatLngBounds();
  geoFences[index].forEach((feature) => {
    feature.getGeometry().forEachLatLng((latlng) => {
      bounds.extend(latlng);
    });
  });
  map.fitBounds(bounds);
}

//
//
// Scocket.IO Events
//
//
socket.on('connected', (msg) => {
  console.log('Client connected via socket.io', msg);
  if (stores.length > 0) {
    return;
  }
  document.getElementById('stores').innerHTML = '';
  msg.forEach((element) => {
    stores.push(element);
    renderStores(element);
  });

  setExtentToStores();
});

socket.on('orders', (msg) => {
  console.log('got orders', msg);

  if (msg == null || msg.length === 0) {
    // alert no orders for this store
  }

  // clear out existing orders and data
  orderGroups.forEach((group) => {
    group.locations = [];
  });

  // replace list of stores with orders
  // show the order driver locations on the map
  msg.forEach((order) => {
    if (order.latestEvent) {
      switch (order.latestEvent.innerGeofence.range) {
        case 120:
          orderGroups[0].locations.push(order);
          break;
        case 300:
          orderGroups[1].locations.push(order);
          break;
        case 600:
          orderGroups[2].locations.push(order);
          break;
        default:
          orderGroups[3].locations.push(order);
      }

      const loc = {
        lat: order.latestEvent.eventLocation.latitude,
        lng: order.latestEvent.eventLocation.longitude,
      };

      new google.maps.Marker({
        position: loc,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 3,
          fillColor: 'black',
          strokeColor: 'grey',
          fillOpacity: 0.8,
          strokeOpacity: 0.5,
          strokeWeight: 0.5,
        },
      });
    }
  });

  // sort them by most recently received
  orderGroups.forEach((list) => {
    list.locations.sort((a, b) => {
      const aDate = new Date(a.latestEvent.eventTimestamp);
      const bDate = new Date(b.latestEvent.eventTimestamp);
      return aDate - bDate;
    });
  });

  // render the isochrone grouping headers
  document.getElementById('stores').innerHTML = '';
  orderGroups.forEach((list) => {
    const template = document.getElementById('order-group-template').innerHTML;
    const rendered = Mustache.render(template, {
      range: {
        id: list.range,
        color: list.color,
        time: list.minutes,
      },
    });
    document.getElementById('stores').innerHTML += rendered;
  });

  // render each order
  orderGroups.forEach((list) => {
    if (list.locations.length === 0) {
      const template = document.getElementById('order-empty-template').innerHTML;
      const rendered = Mustache.render(template);
      document.getElementById(`range-${list.range}`).innerHTML += rendered;
    }

    list.locations.forEach((location) => {
      location.date = new Date(location.latestEvent.eventTimestamp);
      location.date = location.date.toLocaleTimeString();

      // render the order card
      if (!location.latestEvent.innerGeofence.range) {
        location.latestEvent.innerGeofence.range = 601;
      }
      const template = document.getElementById('order-template').innerHTML;
      const rendered = Mustache.render(template, { order: location });
      document.getElementById(`range-${list.range}`).innerHTML += rendered;
    });
  });
});

socket.on('geofences', (msg) => {
  if (geoFences.length > 0) {
    // don't recreate them
    return;
  }
  console.log('got geofences', msg);
  const bounds = new google.maps.LatLngBounds();
  const layers = [];
  const shapes = [];
  msg.reverse(); // assume API returns outter most isochrone at index 0
  msg.forEach(() => {
    layers.push(new google.maps.Data({ map }));
  });
  layers.forEach((layer, i) => {
    let { shape } = msg[i];
    if (i < msg.length - 1) {
      shape = turf.difference(msg[i].shape, msg[i + 1].shape);
    }
    shapes.push(shape);
    layer.addGeoJson(shape, { idPropertyName: `isochrone-${i}` });
    layer.id = i;
    layer.setStyle({
      fillColor: colors[i],
      title: msg[i].range,
      strokeWeight: 0.5,
    });
    // recenter the map to isochrone extents
    layer.forEach((feature) => {
      feature.getGeometry().forEachLatLng((latlng) => {
        bounds.extend(latlng);
      });
    });
    geoFences.push(layer);
  });

  map.fitBounds(bounds);
});
