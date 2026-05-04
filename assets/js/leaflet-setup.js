const leafletTileLayer = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  options: {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

function leafletIsAvailable() {
  return typeof window.L !== "undefined";
}

function addLeafletTileLayer(map, mapElement) {
  const tileLayer = window.L.tileLayer(leafletTileLayer.url, leafletTileLayer.options);
  let tileErrors = 0;

  tileLayer.on("tileerror", () => {
    tileErrors += 1;
    if (tileErrors >= 3) {
      mapElement.classList.add("map-tiles-unavailable");
    }
  });

  tileLayer.on("tileload", () => {
    mapElement.classList.remove("map-tiles-unavailable");
  });

  tileLayer.addTo(map);
}

function setupGeoJsonMaps() {
  document.querySelectorAll("pre>code.language-geojson").forEach((elem) => {
    if (elem.dataset.leafletProcessed === "true" || !leafletIsAvailable()) {
      return;
    }

    let geoJsonData;
    try {
      geoJsonData = JSON.parse(elem.textContent);
    } catch (error) {
      console.warn("Could not parse GeoJSON map data.", error);
      return;
    }

    const backup = elem.parentElement;
    backup.classList.add("unloaded");

    const mapElement = document.createElement("div");
    mapElement.classList.add("map");
    backup.after(mapElement);

    const map = window.L.map(mapElement);
    addLeafletTileLayer(map, mapElement);

    const geoJson = window.L.geoJSON(geoJsonData).addTo(map);
    const bounds = geoJson.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds);
    } else {
      map.setView([0, 0], 2);
    }

    elem.dataset.leafletProcessed = "true";
  });
}

function setupLeafletMaps() {
  setupGeoJsonMaps();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLeafletMaps);
} else {
  setupLeafletMaps();
}
window.addEventListener("load", setupLeafletMaps);
