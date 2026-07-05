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
    const matchesSearch =
      lab.name.toLowerCase().includes(search);

    const matchesFilter =
      currentFilter === "all" ||
      lab.status === currentFilter;

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

      const popupStatusText = lab.status === "open" ? "OPEN" : "CLOSED";

      marker.bindPopup(`
        <strong>${lab.name}</strong><br>
        Coke Tables: ${lab.tables.coke}<br>
        Crack Tables: ${lab.tables.crack}<br>
        Plant Tables: ${lab.tables.plant}<br>
        Status: ${popupStatusText}
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

    const statusText = lab.status === "open" ? "OPEN" : "CLOSED";
    const statusClass = lab.status === "open" ? "status-open" : "status-closed";

    item.innerHTML = `
      <div class="lab-name">${lab.name}</div>

      <div class="lab-meta">
        Coke: ${lab.tables.coke} • Crack: ${lab.tables.crack} • Plant: ${lab.tables.plant}
      </div>

      <div class="lab-meta">
        Status: <span class="${statusClass}">${statusText}</span>
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

document.getElementById("showAllBtn").addEventListener("click", () => {
  currentFilter = "all";
  renderLabs();
});

document.getElementById("showOpenBtn").addEventListener("click", () => {
  currentFilter = "open";
  renderLabs();
});

document.getElementById("showClosedBtn").addEventListener("click", () => {
  currentFilter = "closed";
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
