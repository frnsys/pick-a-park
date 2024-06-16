// - Handle multiple search matches

const OSM_API_URL = 'https://overpass-api.de/api/interpreter';
const BBOX_SIZE = 0.005;
const PICK_BUTTON = document.getElementById('select-park');
const ERROR = document.getElementById('error-message');
const PARKS = {};

function queryArea(query, cb) {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1`;
  fetch(nominatimUrl, {
    headers: {
      'Accept': 'application/json',
    },
    method: 'GET',
  })
    .then(res => res.json())
    .then(matches => {
      if (matches.length > 0) {
        // See <https://giswiki.hsr.ch/Overpass_API>
        const osmId = matches[0].osm_id;
        const areaId = 3600000000 + osmId;
        cb(areaId);
      } else {
        cb(null);
      }
    });
}

function loadParks(areaId, cb) {
  // I think we can leave out relations as they contain ways that would
  // already be labeled as parks.
  //
  // relation["leisure"="park"](area.searchArea);
  const osmQuery = `
    [out:json][timeout:25];
    area(${areaId})->.searchArea;
    (
      node["leisure"="park"](area.searchArea);
      way["leisure"="park"](area.searchArea);
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
      let nodes = {};
      let parks = [];
      elements.forEach((el) => {
        switch (el.type) {
          case "node":
            nodes[el.id] = el;
            break;

          case "way":
            if (el['tags'] && el['tags']['name']) {
              parks.push(el);
            }
            break;

          case "relation":
            break;
        }
      });
      cb({parks, nodes});
    })
    .catch(err => {
      throw err;
    });
}

function rand(arr) {
  let idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function pickRandomPark() {
  PICK_BUTTON.disabled = true;
  PICK_BUTTON.innerText = "Searching for parks...";
  const query = document.getElementById('area-query').value;
  if (query.length == 0) {
    return;
  }

  if (!(query in PARKS)) {
    queryArea(query, (areaId) => {
      if (areaId == null) {
        ERROR.innerText = "No places found";
        ERROR.style.display = "block";
        PICK_BUTTON.disabled = false;
        PICK_BUTTON.innerText = "Pick a Park";
      } else {
        loadParks(areaId, (results) => {
          PARKS[query] = results;
          pickRandomPark();
        });
      }
    });
  } else {
    let {parks, nodes} = PARKS[query];
    if (parks.length == 0) {
      ERROR.innerText = "No parks found";
      ERROR.style.display = "block";
    } else {
      ERROR.style.display = "none";
      ERROR.innerText = "";
      let park = rand(parks);
      let node = nodes[rand(park.nodes)];
      document.getElementById('selected-park').innerText = park['tags']['name'];
      document.getElementById('selected-park-map').src = `https://www.openstreetmap.org/export/embed.html?bbox=${node['lon']-BBOX_SIZE}%2C${node['lat']-BBOX_SIZE}%2C${node['lon']+BBOX_SIZE}%2C${node['lat']+BBOX_SIZE}&layer=mapnik&marker=${node['lat']}%2C${node['lon']}`;;
      document.getElementById('selected-park-street-view').href = `https://maps.google.com/maps?q=&layer=c&cbll=${node['lat']},${node['lon']}&cbp=11,0,0,0,0`;
      document.getElementById('selected-park-info').style.display = 'block';
    }
    PICK_BUTTON.disabled = false;
    PICK_BUTTON.innerText = "⟲ Pick Another Park";
  }
}

// Submit on enter
document.getElementById('area-query').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    pickRandomPark();
  }
});
PICK_BUTTON.addEventListener('click', pickRandomPark);
