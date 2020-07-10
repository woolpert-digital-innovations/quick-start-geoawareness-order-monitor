const socket = io();

//
//
// Globals
//
//

let map = null;
let orderMarkers = [];
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

function alertOrder(callback, delay, reps, orderId) {
  let x = 0;
  const intervalId = window.setInterval(() => {
    callback(x, orderId);
    if (++x === reps) {
      window.clearInterval(intervalId);
    }
  }, delay);
}

//
//
// UI Events
//
//

function onGetOrders(id) {
  console.log('Getting orders for ', id);
  socket.emit('get geofences', id);
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

function onCloseOrder(orderId, storeName) {
  socket.emit('close order', { orderId, storeName });
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
  const previousOrders = [];
  orderGroups.forEach((group) => {
    group.locations.forEach((item) => {
      previousOrders.push(item);
    });
    group.locations = [];
  });

  // replace list of stores with orders
  // show the order driver locations on the map
  orderMarkers.forEach((marker) => {
    marker.setMap(null);
  });
  orderMarkers = [];
  msg.forEach((order) => {
    if (order.latestEvent && !order.latestEvent.innerGeofence) {
      orderGroups[3].locations.push(order);
    } else if (order.latestEvent) {
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
    }
  });

  // sort them by most recently received
  orderGroups.forEach((list) => {
    list.locations.sort((a, b) => {
      const aDate = new Date(a.latestEvent.eventTimestamp * 1000);
      const bDate = new Date(b.latestEvent.eventTimestamp * 1000);
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
  orderGroups.forEach((list) => {
    // indicate to user no orders for this isochrone range
    let emptyGroup = true;
    list.locations.forEach((order) => {
      if (!order.status.includes('closed')) {
        emptyGroup = false;
      }
    });
    if (emptyGroup) {
      const template = document.getElementById('order-empty-template').innerHTML;
      const rendered = Mustache.render(template);
      document.getElementById(`range-${list.range}`).innerHTML += rendered;
    }

    // render each order
    list.locations.forEach((location) => {
      if (!location.status.includes('closed')) {
        location.date = new Date(location.latestEvent.eventTimestamp * 1000);
        location.date = location.date.toLocaleTimeString();
        const loc = {
          lat: location.latestEvent.eventLocation.latitude,
          lng: location.latestEvent.eventLocation.longitude,
        };

        // create a map marker
        orderMarkers.push(new google.maps.Marker({
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
        }));

        // render the order card
        const template = document.getElementById('order-template').innerHTML;
        const rendered = Mustache.render(template, { order: location });
        document.getElementById(`range-${list.range}`).innerHTML += rendered;

        // alert the user as the order enters the inner most isochrone
        previousOrders.forEach((order) => {
          if (order.orderId === location.orderId
              && order.latestEvent && order.latestEvent.innerGeofence
              && order.latestEvent.innerGeofence.range === 300
              && list.range === 120) {
            // callback function for flashing the order
            alertOrder((count, orderId) => {
              const orderElement = document.getElementById(`order-${orderId}`);
              if (count % 2 === 0) {
                console.log('flash on');
                orderElement.classList.add('flash');
              } else {
                console.log('flash off');
                orderElement.classList.remove('flash');
              }
            }, 100, 8, order.orderId);
          }
        });
      }
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
      strokeWeight: 0.1,
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

socket.on('closed', (msg) => {
  // nothing to do on the client
  console.log('I closed', msg);
});
