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
  if (msg == null) {
    
  }
  console.log('got orders', msg);
});
