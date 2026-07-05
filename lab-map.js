const mapImage = "assets/map/satellite-map-final.jpg";

const imageWidth = 1280;
const imageHeight = 1280;

let selectedLabId = null;
let currentFilter = "all";

const labs = window.LABS || [];

const map = L.map("labMap", {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 5,
  zoomSnap: 0.25,
  wheelPxPerZoomLevel: 90
});

const bounds = [[0, 0], [imageHeight, imageWidth]];

L.imageOverlay(mapImage, bounds).addTo(map);
map.fitBounds(bounds);

const markerLayer = L.layerGroup().addTo(map);
const markerMap = {};

function hasCoords(lab) {
  return lab.map && lab.map.x !== null && lab.map.y !== null;
}

function createLabIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="marker-dot"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function getVisibleLabs() {
  const search = document.getElementById("labSearch").value.toLowerCase().trim();

  return labs.filter(lab => {
    const mapped = hasCoords(lab);

    const matchesSearch =
      lab.name.toLowerCase().includes(search);

    const matchesFilter =
      currentFilter === "all" ||
      currentFilter === "mapped" && mapped ||
      currentFilter === "unmapped" && !mapped;

    return matchesSearch && matchesFilter;
  });
}

function renderLabs() {
  markerLayer.clearLayers();

  Object.keys(markerMap).forEach(key => {
    delete markerMap[key];
  });

  const labList = document.getElementById("labList");
  labList.innerHTML = "";

  const visibleLabs = getVisibleLabs();

  visibleLabs.forEach(lab => {
    const mapped = hasCoords(lab);

    if (mapped) {
      const marker = L.marker([lab.map.y, lab.map.x], {
        icon: createLabIcon()
      }).addTo(markerLayer);

      marker.bindPopup(`
        <strong>${lab.name}</strong><br>
        Coke Tables: ${lab.tables.coke}<br>
        Crack Tables: ${lab.tables.crack}<br>
        Plant Tables: ${lab.tables.plant}<br>
        X: ${lab.map.x}, Y: ${lab.map.y}
      `);

      marker.on("click", () => {
        selectLab(lab.id);
        focusLab(lab.id);
      });

      markerMap[lab.id] = marker;
    }

    const item = document.createElement("div");
    item.className = "lab-item";
    item.id = `list-${lab.id}`;

    item.innerHTML = `
      <div class="lab-name">${lab.name}</div>
      <div class="lab-meta">
        Coke: ${lab.tables.coke} • Crack: ${lab.tables.crack} • Plant: ${lab.tables.plant}
      </div>
      <div class="lab-meta">
        ${mapped 
          ? `<span class="mapped">MAPPED</span> — X: ${lab.map.x}, Y: ${lab.map.y}` 
          : `<span class="unmapped">UNMAPPED</span>`}
      </div>
    `;

    item.addEventListener("click", () => {
      selectLab(lab.id);

      if (mapped) {
        focusLab(lab.id);
      }
    });

    labList.appendChild(item);
  });
}

function selectLab(id) {
  selectedLabId = id;

  const lab = labs.find(l => l.id === id);

  document.getElementById("selectedLabBox").innerHTML = `
    Selected: <strong>${lab.name}</strong><br>
    Click the map to place or move this lab.
  `;

  highlightLab(id);
}

function focusLab(id) {
  const lab = labs.find(l => l.id === id);
  const marker = markerMap[id];

  if (!lab || !marker) return;

  const target = [lab.map.y, lab.map.x];
  const targetZoom = 1.75;

  map.flyTo(target, targetZoom, {
    animate: true,
    duration: 0.6
  });

  map.once("moveend", () => {
    marker.openPopup();
  });

  highlightLab(id);
}

function highlightLab(id) {
  document.querySelectorAll(".lab-item").forEach(item => {
    item.classList.remove("active");
  });

  const item = document.getElementById(`list-${id}`);

  if (item) {
    item.classList.add("active");
    item.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }
}

map.on("click", function(e) {
  if (!selectedLabId) {
    console.log("Clicked map coordinate:", {
      x: Math.round(e.latlng.lng),
      y: Math.round(e.latlng.lat)
    });
    return;
  }

  const lab = labs.find(l => l.id === selectedLabId);

  if (!lab) return;

  const x = Math.round(e.latlng.lng);
  const y = Math.round(e.latlng.lat);

  const confirmed = confirm(`Set ${lab.name} marker here?\n\nx: ${x}, y: ${y}`);

  if (!confirmed) return;

  lab.map.x = x;
  lab.map.y = y;

  console.log("Updated lab:", lab);
  console.log("Copy this full LABS data back into data/labs.js:");
  console.log(JSON.stringify(labs, null, 2));

  renderLabs();
  focusLab(lab.id);
});

document.getElementById("showAllBtn").addEventListener("click", () => {
  currentFilter = "all";
  renderLabs();
});

document.getElementById("showMappedBtn").addEventListener("click", () => {
  currentFilter = "mapped";
  renderLabs();
});

document.getElementById("showUnmappedBtn").addEventListener("click", () => {
  currentFilter = "unmapped";
  renderLabs();
});

document.getElementById("labSearch").addEventListener("input", renderLabs);

renderLabs();

const params = new URLSearchParams(window.location.search);
const startingLabId = params.get("lab");

if (startingLabId) {
  setTimeout(() => {
    selectLab(startingLabId);
    focusLab(startingLabId);
  }, 300);
}
