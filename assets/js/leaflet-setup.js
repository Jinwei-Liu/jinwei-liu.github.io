const leafletTileLayers = [
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    coordinateSystem: "wgs84",
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  {
    name: "CARTO Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    coordinateSystem: "wgs84",
    options: {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  {
    name: "Esri World Street Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    coordinateSystem: "wgs84",
    options: {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors, and the GIS User Community",
    },
  },
  {
    name: "GeoQ China",
    url: "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}",
    coordinateSystem: "gcj02",
    options: {
      maxZoom: 18,
      attribution: "Tiles &copy; GeoQ",
    },
  },
];

function leafletIsAvailable() {
  return typeof window.L !== "undefined";
}

function addLeafletTileLayer(map, mapElement, onProviderChange = () => {}) {
  let providerIndex = 0;
  let activeLayer = null;

  const useProvider = (nextProviderIndex) => {
    const provider = leafletTileLayers[nextProviderIndex];
    if (!provider) {
      mapElement.classList.add("map-tiles-unavailable");
      return;
    }

    providerIndex = nextProviderIndex;
    mapElement.classList.remove("map-tiles-unavailable");
    mapElement.dataset.mapProvider = provider.name;

    if (activeLayer) {
      map.removeLayer(activeLayer);
    }

    let tileErrors = 0;
    let tileLoads = 0;
    const tileLayer = window.L.tileLayer(provider.url, provider.options);

    const useNextProvider = () => {
      if (activeLayer !== tileLayer || tileLoads > 0) {
        return;
      }
      useProvider(providerIndex + 1);
    };

    tileLayer.on("tileload", () => {
      tileLoads += 1;
    });

    tileLayer.on("tileerror", () => {
      tileErrors += 1;
      if (tileErrors >= 3) {
        useNextProvider();
      }
    });

    activeLayer = tileLayer;
    tileLayer.addTo(map);
    onProviderChange(provider);

    window.setTimeout(useNextProvider, 5000);
  };

  useProvider(providerIndex);
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

function outOfChina(latitude, longitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(x, y) {
  let result = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  result += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  result += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  result += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return result;
}

function transformLongitude(x, y) {
  let result = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  result += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  result += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  result += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return result;
}

function wgs84ToGcj02(latitude, longitude) {
  if (outOfChina(latitude, longitude)) {
    return [latitude, longitude];
  }

  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLatitude(longitude - 105.0, latitude - 35.0);
  let dLon = transformLongitude(longitude - 105.0, latitude - 35.0);
  const radLat = (latitude / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [latitude + dLat, longitude + dLon];
}

function getMarkerLatLng(marker, provider) {
  if (provider.coordinateSystem === "gcj02") {
    return wgs84ToGcj02(marker.latitude, marker.longitude);
  }
  return [marker.latitude, marker.longitude];
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

    if (!markers.length || !leafletIsAvailable()) {
      return;
    }

    mapElement.dataset.leafletProcessed = "true";
    mapElement.replaceChildren();

    const map = window.L.map(mapElement, {
      scrollWheelZoom: false,
    });
    const markerLayer = window.L.layerGroup().addTo(map);
    const markerIcon = window.L.divIcon({
      className: "cv-education-map-pin",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10],
    });

    const renderMarkers = (provider) => {
      const bounds = window.L.latLngBounds();
      markerLayer.clearLayers();

      markers.forEach((marker) => {
        const latLng = getMarkerLatLng(marker, provider);
        const popupContent = [
          `<strong>${escapeHtml(marker.name)}</strong>`,
          marker.degree ? `<div>${escapeHtml(marker.degree)}</div>` : "",
          marker.location ? `<div class="cv-education-popup-location">${escapeHtml(marker.location)}</div>` : "",
        ].join("");

        window.L.marker(latLng, { icon: markerIcon }).addTo(markerLayer).bindPopup(popupContent);
        bounds.extend(latLng);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.45), {
          maxZoom: 7,
        });
      }
    };

    addLeafletTileLayer(map, mapElement, renderMarkers);
    window.setTimeout(() => map.invalidateSize(), 0);
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
