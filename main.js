const OSM_API_URL = 'https://overpass-api.de/api/interpreter';
const BBOX_SIZE = 0.005;
const BOROUGH_IDS = {
  'bronx': '3609691916',
  'queens': '3609691819',
  'brooklyn': '3609691750',
  'manhattan': '3608398124',
  'staten_island': '3609691948'
};
const BOROUGH_PARKS = {};
const PICK_BUTTON = document.getElementById('select-park');


function loadBoroughParks(borough, cb) {
  const boroughId = BOROUGH_IDS[borough];

  // Could have
  //  way["leisure"="park"](area.searchArea);
  //  relation["leisure"="park"](area.searchArea);
  // in addition to nodes, but only nodes have lat/lons
  const osmQuery = `
    [out:json][timeout:25];
    area(${boroughId})->.searchArea;
    (
      node["leisure"="park"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  const formData = new FormData();
  formData.append('data', osmQuery);
  fetch(OSM_API_URL, {
    headers: {
      'Accept': 'application/json',
    },
    method: 'POST',
    body: new URLSearchParams(formData)
  })
    .then(res => res.json())
    .then(({elements}) => {
      const parks = elements.filter((el) => el['tags'] && el['tags']['name']);
      cb(parks);
    })
    .catch(err => {
      throw err;
    });
}


function pickRandomPark() {
  PICK_BUTTON.disabled = true;
  const borough = document.getElementById('select-borough').value;
  if (!(borough in BOROUGH_PARKS)) {
    loadBoroughParks(borough, (parks) => {
      BOROUGH_PARKS[borough] = parks;
      pickRandomPark();
    });
  } else {
    let parks = BOROUGH_PARKS[borough];
    let idx = Math.floor(Math.random() * parks.length);
    let park = parks[idx];
    document.getElementById('selected-park').innerText = park['tags']['name'];
    document.getElementById('selected-park-map').src = `https://www.openstreetmap.org/export/embed.html?bbox=${park['lon']-BBOX_SIZE}%2C${park['lat']-BBOX_SIZE}%2C${park['lon']+BBOX_SIZE}%2C${park['lat']+BBOX_SIZE}&layer=mapnik&marker=${park['lat']}%2C${park['lon']}`;;
    document.getElementById('selected-park-street-view').href = `https://maps.google.com/maps?q=&layer=c&cbll=${park['lat']},${park['lon']}&cbp=11,0,0,0,0`;
    document.getElementById('selected-park-info').style.display = 'block';
    PICK_BUTTON.disabled = false;
  }
}

PICK_BUTTON.addEventListener('click', pickRandomPark);

