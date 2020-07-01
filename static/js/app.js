const socket = io();
let map = null;

function loadMap() {
  let location = new google.maps.LatLng(1, 1);

  var options = {
    center: location,
    zoom: 0
  };

  map = new google.maps.Map(document.getElementById("map-container"), options);
}

function setMapExtent(stores) {
  var bounds = new google.maps.LatLngBounds();

  stores.forEach(store => {
    const latlng = new google.maps.LatLng(store.location.latitude, store.location.longitude);
    bounds.extend(latlng);
  });

   map.fitBounds(bounds);
}

function renderStores(store) {
  const template = document.getElementById('store-template').innerHTML;
  const rendered = Mustache.render(template, { location: store });
  document.getElementById('stores').innerHTML += rendered;

  const loc = {lat: store.location.latitude, lng: store.location.longitude};
  const marker = new google.maps.Marker({
    position: loc,
    map: map,
    title: store.storeName
  });
  marker.addListener("click", function() {
    getOrders(store.name);
  });
}

function getOrders(id) {
  console.log("Getting orders for ", id);
  socket.emit('get orders', id);
}

google.maps.event.addDomListener(window, 'load', loadMap);

socket.on('connected', function(msg){
  console.log('Client connected via socket.io', msg)
  document.getElementById('stores').innerHTML = '';
  msg.forEach(element => {
    renderStores(element);
  });
  setMapExtent(msg)
});

socket.on('orders', function(msg) {
  if (msg == null || msg.length == 0) {
    // alert no orders for this store
  } else {
    console.log('got orders', msg);
    socket.emit('get geofences', msg.storeName);
    // replace list of stores with orders
    // show the order driver locations on the map
  }
});

socket.on('geofences', function(msg) {
  console.log('got geofences', msg);
  const colors = ['green', 'yellow', 'red']
  let bounds = new google.maps.LatLngBounds();
  let layers = [];
  msg = msg.reverse(); // assume API returns outter most isochrone at index 0
  msg.forEach((isochrone, i) => {
    layers.push(new google.maps.Data({map: map}));
  });
  layers.forEach((layer, i) => {
    let shape = msg[i].shape;
    if (i < msg.length-1) {
      shape = turf.difference(msg[i].shape, msg[i+1].shape);
    }
    layer.addGeoJson(shape);
    layer.setStyle({
      fillColor: colors[i],
      title: msg[i].range,
      strokeWidth: 1
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
