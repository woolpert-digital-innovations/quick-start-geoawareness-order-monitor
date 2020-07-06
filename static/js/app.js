const socket = io();
let map = null;
const colors = ['green', 'yellow', 'red', 'grey']

function getColor(range) {
  switch(range) {
    case 120:
      return colors[2];
    case 300:
      return colors[1];
    default:
      return colors[0];
  }
}

function loadMap() {
  let location = new google.maps.LatLng(1, 1);

  var options = {
    center: location,
    zoom: 0,
    mapId: '6a9eb25b0d956d9d',
    gestureHandling: 'greedy' // disable the stupid default CTRL required to zoom
  };

  map = new google.maps.Map(document.getElementById("map-container"), options);
}

function renderStores(store) {
  const template = document.getElementById('store-template').innerHTML;
  const rendered = Mustache.render(template, { location: store });
  document.getElementById('stores').innerHTML += rendered;

  const loc = {lat: store.location.latitude, lng: store.location.longitude};
  const star = {
    path: 'M 125,5 155,90 245,90 175,145 200,230 125,180 50,230 75,145 5,90 95,90 z',
    fillColor: 'blue',
    fillOpacity: 0.8,
    scale: .1,
    strokeColor: 'black',
    strokeWeight: 1.5
  };
  const marker = new google.maps.Marker({
    position: loc,
    map: map,
    icon: star
  });
  marker.addListener("click", function() {
    getOrders(store.name);
  });
}

function getOrders(id) {
  console.log("Getting orders for ", id);
  socket.emit('get orders', id);
}

socket.on('connected', function(msg){
  console.log('Client connected via socket.io', msg)
  document.getElementById('stores').innerHTML = '';
  msg.forEach(element => {
    renderStores(element);
  });

  // set extent to the store locations
  var bounds = new google.maps.LatLngBounds();
  msg.forEach(store => {
    const latlng = new google.maps.LatLng(store.location.latitude, store.location.longitude);
    bounds.extend(latlng);
  });
  map.fitBounds(bounds);
});

let orders = [];
socket.on('orders', function(msg) {
  if (msg == null || msg.length == 0) {
    // alert no orders for this store
  } else {
    console.log('got orders', msg);

    orders = [
      {
        minutes: "2",
        range: 120,
        color: colors[2],
        locations: []
      },
      {
        minutes: "5",
        range: 300,
        color: colors[1],
        locations: []
      },
      {
        minutes: "10",
        range: 600,
        color: colors[0],
        locations: []
      },
      {
        minutes: ">10",
        range: 601,
        locations: []
      },
    ];

    // replace list of stores with orders
    // show the order driver locations on the map
    let locations = [];
    msg.forEach(order => {
      switch(order.latestEvent.innnerGeofence) {
        case 120:
          orders[0].locations.push(order);
          break;
        case 300:
          orders[1].locations.push(order);
          break;
        case 600:
          orders[2].locations.push(order);
          break;
        default:
          orders[3].locations.push(order);
      }

      const loc = {lat: order.latestEvent.eventLocation.latitude, lng: order.latestEvent.eventLocation.longitude};
      locations.push(loc);
      new google.maps.Marker({
        position: loc,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 3,
          strokeColor: "red"
        },
      });
    });

    // sort them by most recently received
    orders.forEach(list => {
      list.locations.sort((a,b) => {
        aDate = new Date(a.latestEvent.eventTimestamp);
        bDate = new Date(b.latestEvent.eventTimestamp);
        return a-b;
      });
    });

    // render the orders by their isocrhone grouping
    document.getElementById('stores').innerHTML = '';
    orders.forEach(list => {
      const template = document.getElementById('order-group-template').innerHTML;
      const rendered = Mustache.render(template, {
        range: {
          id: list.range,
          color: list.color,
          time: list.minutes,
        }
      });
      document.getElementById('stores').innerHTML += rendered;
    });

    orders.forEach(list => {
      list.locations.forEach(location => {
        location.date = new Date(location.latestEvent.eventTimestamp);
        location.date = location.date.toLocaleTimeString();

        // render the order card
        if (!location.latestEvent.innerGeofence.range) {
          location.latestEvent.innerGeofence.range = 601;
        }
        const template = document.getElementById('order-template').innerHTML;
        const rendered = Mustache.render(template, { order: location });
        document.getElementById(`range-${location.latestEvent.innerGeofence.range}`).innerHTML += rendered;
      })
    })

    socket.emit('get geofences', msg.storeName);

    // set extent to the orders
    //var bounds = new google.maps.LatLngBounds();
    //locations.forEach(loc => {
    //  bounds.extend(loc);
    //});
    //map.fitBounds(bounds);
  }
});

socket.on('geofences', function(msg) {
  console.log('got geofences', msg);
  let bounds = new google.maps.LatLngBounds();
  let layers = [];
  let shapes = [];
  msg = msg.reverse(); // assume API returns outter most isochrone at index 0
  msg.forEach((isochrone, i) => {
    layers.push(new google.maps.Data({map: map}));
  });
  layers.forEach((layer, i) => {
    let shape = msg[i].shape;
    if (i < msg.length-1) {
      shape = turf.difference(msg[i].shape, msg[i+1].shape);
    }
    shapes.push(shape);
    layer.addGeoJson(shape, {idPropertyName: `isochrone-${i}`});
    layer.id = i;
    layer.setStyle({
      fillColor: colors[i],
      title: msg[i].range,
      strokeWeight: .5
    });
    // recenter the map to isochrone extents
    layer.forEach(function(feature){
      feature.getGeometry().forEachLatLng(function(latlng){
         bounds.extend(latlng);
      });
    });
  });

  map.fitBounds(bounds);
});
