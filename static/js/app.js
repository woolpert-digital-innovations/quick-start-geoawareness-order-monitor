const socket = io();
let map = null;
const colors = ['green', 'yellow', 'red']

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
    strokeColor: 'red',
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
    orders = msg;

    // replace list of stores with orders
    // show the order driver locations on the map
    let locations = [];
    msg.forEach(order => {
      const loc = {lat: order.latestEvent.eventLocation.latitude, lng: order.latestEvent.eventLocation.longitude};
      locations.push(loc);
      new google.maps.Marker({
        position: loc,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5
        },
      });
    });
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

  // Generate Random Driver Locations
  var locations = [];
  var bbox = turf.bbox(shapes[0]);
  var ordernum = 9000;
  for (var i = 0; i < 30; i++) {
    var pos = turf.randomPosition(bbox);
    locations.push(pos)
  }
  console.log('current orders are', orders)
  console.log('randoms is', JSON.stringify(locations))
    locations.forEach(loc => {
      let range = -1;
      shapes.forEach(shape => {
        if (turf.booleanWithin(turf.point(loc), shape.geometry)) {
          range = shape.properties.value;
          console.log(`intersects with ${range}`, loc)
        };
      });
      let newOrder = JSON.parse(JSON.stringify(orders[0]));
      ordernum++;
      newOrder.latestEvent.eventLocation.latitude = loc[1];
      newOrder.latestEvent.eventLocation.longitude = loc[0];
      newOrder.latestEvent.innerGeofence.range = range;
      newOrder.orderId = ordernum;
      if (range == -1) {
        newOrder.latestEvent.innerGeofence = {};
        newOrder.latestEvent.intersectsEvent = false;
      }
      // take all oders, stringify, make as new mock data
      orders.push(newOrder);
    });
  console.log('new orders are', orders)
  console.log(JSON.stringify(orders))
});
