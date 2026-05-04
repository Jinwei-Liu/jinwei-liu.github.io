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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
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

function setupEducationMaps() {
  document.querySelectorAll(".cv-education-map").forEach((mapElement) => {
    if (mapElement.dataset.leafletProcessed === "true") {
      return;
    }

    const markerElements = Array.from(mapElement.querySelectorAll(".cv-education-map-marker"));
    const markers = markerElements
      .map((markerElement) => {
        return {
          name: markerElement.dataset.name,
          degree: markerElement.dataset.degree,
          location: markerElement.dataset.location,
          latitude: Number(markerElement.dataset.latitude),
          longitude: Number(markerElement.dataset.longitude),
        };
      })
      .filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude));

    if (!markers.length) {
      return;
    }

    if (!leafletIsAvailable()) {
      mapElement.classList.add("map-unavailable");
      return;
    }

    mapElement.dataset.leafletProcessed = "true";
    mapElement.replaceChildren();

    const map = window.L.map(mapElement, {
      scrollWheelZoom: false,
    });
    addLeafletTileLayer(map, mapElement);

    const markerIcon = window.L.divIcon({
      className: "cv-education-pin",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10],
    });
    const bounds = window.L.latLngBounds();

    markers.forEach((marker) => {
      const latLng = [marker.latitude, marker.longitude];
      const popupContent = [
        `<strong>${escapeHtml(marker.name)}</strong>`,
        marker.degree ? `<div>${escapeHtml(marker.degree)}</div>` : "",
        marker.location ? `<div class="cv-education-popup-location">${escapeHtml(marker.location)}</div>` : "",
      ].join("");

      window.L.marker(latLng, { icon: markerIcon }).addTo(map).bindPopup(popupContent);
      bounds.extend(latLng);
    });

    if (markers.length === 1) {
      map.setView(bounds.getCenter(), 12);
    } else {
      map.fitBounds(bounds.pad(0.25));
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  });
}

function setupLeafletMaps() {
  setupGeoJsonMaps();
  setupEducationMaps();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLeafletMaps);
} else {
  setupLeafletMaps();
}
window.addEventListener("load", setupLeafletMaps);
