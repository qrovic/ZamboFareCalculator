// Helper: Haversine formula
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// DOM elements
const stepCards = [
    document.getElementById('step1'),
    document.getElementById('step2'),
    document.getElementById('step3'),
    document.getElementById('step4')
];
const stepIndicators = [
    document.getElementById('step1-indicator'),
    document.getElementById('step2-indicator'),
    document.getElementById('step3-indicator'),
    document.getElementById('step4-indicator')
];
const passengerCount = document.getElementById('passengerCount');
const toStep2Btn = document.getElementById('toStep2Btn');
const toStep3Btn = document.getElementById('toStep3Btn');
const toStep4Btn = document.getElementById('toStep4Btn');
const restartBtn = document.getElementById('restartBtn');
const locateMeBtn = document.getElementById('locateMeBtn');
const locateMeDestBtn = document.getElementById('locateMeDestBtn');
const resultDiv = document.getElementById('result');

let currentStep = 0;
let currentMap, destinationMap;
let currentMarker, destinationMarker;
let currentCoords = null, destinationCoords = null;
let mapsInitialized = [false, false];

function showStep(step) {
    console.log('Showing step', step + 1);
    stepCards.forEach((card, i) => {
        card.classList.toggle('active', i === step);
    });
    // Progress bar animation and step highlight
    const progressFill = document.getElementById('progressFill');
    const stepPercents = [5, 35, 66.6, 100];
    progressFill.style.width = stepPercents[step] + '%';
    for (let i = 1; i <= 4; i++) {
        const stepCircle = document.getElementById('progressStep' + i);
        if (i - 1 === step) {
            stepCircle.classList.add('active');
        } else {
            stepCircle.classList.remove('active');
        }
    }
    // Always add .disabled when entering current location step until marker is set
    if (step === 1) {
        toStep3Btn.classList.add('disabled');
    }
    // Always add .disabled when entering destination step until marker is set
    if (step === 2) {
        toStep4Btn.classList.add('disabled');
    }
    // Lazy init maps
    if (step === 1 && !mapsInitialized[0]) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                initCurrentMap();
                setTimeout(() => { if (currentMap) { console.log('Invalidate currentMap size (1)'); currentMap.invalidateSize(); } }, 200);
                setTimeout(() => { if (currentMap) { console.log('Invalidate currentMap size (2)'); currentMap.invalidateSize(); } }, 600);
            }, 50);
        });
        mapsInitialized[0] = true;
    } else if (step === 1 && currentMap) {
        setTimeout(() => { console.log('Invalidate currentMap size (step revisit)'); currentMap.invalidateSize(); }, 100);
    }
    if (step === 2 && !mapsInitialized[1]) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                initDestinationMap();
                setTimeout(() => { if (destinationMap) { console.log('Invalidate destinationMap size (1)'); destinationMap.invalidateSize(); } }, 200);
                setTimeout(() => { if (destinationMap) { console.log('Invalidate destinationMap size (2)'); destinationMap.invalidateSize(); } }, 600);
            }, 50);
        });
        mapsInitialized[1] = true;
    } else if (step === 2 && destinationMap) {
        setTimeout(() => { console.log('Invalidate destinationMap size (step revisit)'); destinationMap.invalidateSize(); }, 100);
    }
}

// Step 1: Passengers
showStep(0);
toStep2Btn.addEventListener('click', () => {
    showStep(1);
});

const zamboangaBounds = L.latLngBounds([
  [6.78, 121.90], // More southwest
  [8, 122.32]  // Northeast, covers Lubigan but not Zamboanga del Norte
]);

// Step 2: Current Location
function initCurrentMap() {
    const mapDiv = document.getElementById('currentMap');
    mapDiv.innerHTML = '';
    console.log('Initializing currentMap');
    console.log('currentMap container size before:', mapDiv.offsetWidth, mapDiv.offsetHeight);
    currentMap = L.map('currentMap').setView([6.9214, 122.0790], 13);
    currentMap.setMaxBounds(zamboangaBounds);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(currentMap);
    currentMap.on('click', function(e) {
        if (!zamboangaBounds.contains(e.latlng)) {
            alert('Please select a location within Zamboanga City.');
            return;
        }
        console.log('Current location set by click:', e.latlng);
        setCurrentMarker(e.latlng.lat, e.latlng.lng);
        toStep3Btn.classList.remove('disabled');
    });
    // GeoSearch
    const currentProvider = new window.GeoSearch.OpenStreetMapProvider();
    const currentSearch = new window.GeoSearch.GeoSearchControl({
        provider: currentProvider,
        style: 'bar',
        showMarker: false,
        retainZoomLevel: false,
        autoClose: true,
        searchLabel: 'Search for current location',
        keepResult: false
    });
    currentMap.addControl(currentSearch);
    currentMap.on('geosearch/showlocation', function(result) {
        const { x: lng, y: lat } = result.location;
        const latlng = L.latLng(lat, lng);
        if (!zamboangaBounds.contains(latlng)) {
            alert('Please select a location within Zamboanga City.');
            return;
        }
        console.log('Current location set by search:', { lat, lng });
        setCurrentMarker(lat, lng);
        currentMap.setView([lat, lng], 15);
        toStep3Btn.classList.remove('disabled');
    });
    setTimeout(() => {
        console.log('currentMap container size after:', mapDiv.offsetWidth, mapDiv.offsetHeight);
        currentMap.invalidateSize();
    }, 200);
    setTimeout(() => { currentMap.invalidateSize(); }, 600);
}
function setCurrentMarker(lat, lng) {
    if (currentMarker) currentMap.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lng]).addTo(currentMap);
    currentCoords = { lat, lng };
    console.log('Current marker set:', { lat, lng });
    // Enable Next button when current location is set
    toStep3Btn.classList.remove('disabled');
    // Fetch and display address
    updateCurrentAddress(lat, lng);
}

function showLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function shortenToZamboanga(address) {
    const idx = address.indexOf('Zamboanga City');
    if (idx !== -1) {
        return address.slice(0, idx + 'Zamboanga City'.length);
    }
    return address; // fallback to full address if not found
}

function updateCurrentAddress(lat, lng) {
    const addressP = document.getElementById('currentAddress');
    addressP.textContent = 'Loading address...';
    showLoadingOverlay();
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                addressP.textContent = shortenToZamboanga(data.display_name);
            } else {
                addressP.textContent = 'Address not found.';
            }
            hideLoadingOverlay();
        })
        .catch(() => {
            addressP.textContent = 'Unable to fetch address.';
            hideLoadingOverlay();
        });
}
// Store original innerHTML for both locate me buttons
const locateMeBtnOriginal = document.getElementById('locateMeBtn').innerHTML;
const locateMeDestBtnOriginal = document.getElementById('locateMeDestBtn').innerHTML;

locateMeBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    locateMeBtn.disabled = true;
    locateMeBtn.innerHTML = 'Locating...';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log('Current location set by geolocation:', { lat, lng });
            setCurrentMarker(lat, lng);
            currentMap.setView([lat, lng], 15);
            locateMeBtn.disabled = false;
            locateMeBtn.innerHTML = locateMeBtnOriginal;
        },
        (err) => {
            alert('Unable to retrieve your location.');
            locateMeBtn.disabled = false;
            locateMeBtn.innerHTML = locateMeBtnOriginal;
        }
    );
});
toStep3Btn.addEventListener('click', (e) => {
    if (toStep3Btn.classList.contains('disabled')) {
        alert('Please select a location on the map before proceeding.');
        e.preventDefault();
        return;
    }
    if (!currentCoords) {
        alert('Please set your current location!');
        return;
    }
    showStep(2);
});
// Step 3: Destination
function initDestinationMap() {
    const mapDiv = document.getElementById('destinationMap');
    mapDiv.innerHTML = '';
    console.log('Initializing destinationMap');
    console.log('destinationMap container size before:', mapDiv.offsetWidth, mapDiv.offsetHeight);
    destinationMap = L.map('destinationMap').setView([6.9214, 122.0790], 13);
    destinationMap.setMaxBounds(zamboangaBounds);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(destinationMap);
    destinationMap.on('click', function(e) {
        if (!zamboangaBounds.contains(e.latlng)) {
            alert('Please select a location within Zamboanga City.');
            return;
        }
        console.log('Destination set by click:', e.latlng);
        setDestinationMarker(e.latlng.lat, e.latlng.lng);
        toStep4Btn.classList.remove('disabled');
    });
    // GeoSearch
    const destinationProvider = new window.GeoSearch.OpenStreetMapProvider();
    const destinationSearch = new window.GeoSearch.GeoSearchControl({
        provider: destinationProvider,
        style: 'bar',
        showMarker: false,
        retainZoomLevel: false,
        autoClose: true,
        searchLabel: 'Search for destination',
        keepResult: false
    });
    destinationMap.addControl(destinationSearch);
    destinationMap.on('geosearch/showlocation', function(result) {
        const { x: lng, y: lat } = result.location;
        const latlng = L.latLng(lat, lng);
        if (!zamboangaBounds.contains(latlng)) {
            alert('Please select a location within Zamboanga City.');
            return;
        }
        console.log('Destination set by search:', { lat, lng });
        setDestinationMarker(lat, lng);
        destinationMap.setView([lat, lng], 15);
        toStep4Btn.classList.remove('disabled');
    });
    setTimeout(() => {
        console.log('destinationMap container size after:', mapDiv.offsetWidth, mapDiv.offsetHeight);
        destinationMap.invalidateSize();
    }, 200);
    setTimeout(() => { destinationMap.invalidateSize(); }, 600);
}
function setDestinationMarker(lat, lng) {
    if (destinationMarker) destinationMap.removeLayer(destinationMarker);
    destinationMarker = L.marker([lat, lng]).addTo(destinationMap);
    destinationCoords = { lat, lng };
    console.log('Destination marker set:', { lat, lng });
    // Enable Show Fare button when destination is set
    toStep4Btn.classList.remove('disabled');
    // Fetch and display address
    updateDestinationAddress(lat, lng);
}

function updateDestinationAddress(lat, lng) {
    const addressP = document.getElementById('destinationAddress');
    addressP.textContent = 'Loading address...';
    showLoadingOverlay();
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                addressP.textContent = shortenToZamboanga(data.display_name);
            } else {
                addressP.textContent = 'Address not found.';
            }
            hideLoadingOverlay();
        })
        .catch(() => {
            addressP.textContent = 'Unable to fetch address.';
            hideLoadingOverlay();
        });
}
locateMeDestBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    locateMeDestBtn.disabled = true;
    locateMeDestBtn.innerHTML = 'Locating...';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log('Destination set by geolocation:', { lat, lng });
            setDestinationMarker(lat, lng);
            destinationMap.setView([lat, lng], 15);
            locateMeDestBtn.disabled = false;
            locateMeDestBtn.innerHTML = locateMeDestBtnOriginal;
        },
        (err) => {
            alert('Unable to retrieve your location.');
            locateMeDestBtn.disabled = false;
            locateMeDestBtn.innerHTML = locateMeDestBtnOriginal;
        }
    );
});
toStep4Btn.addEventListener('click', (e) => {
    if (toStep4Btn.classList.contains('disabled')) {
        alert('Please select a destination on the map before proceeding.');
        e.preventDefault();
        return;
    }
    if (!destinationCoords) {
        alert('Please set your destination!');
        return;
    }
    // Calculate distance and fare
    const dist = haversine(currentCoords.lat, currentCoords.lng, destinationCoords.lat, destinationCoords.lng);
    const passengers = parseInt(passengerCount.value, 10);
    let fare = 35; // base fare for 1st km, 1 or 2 passengers
    if (passengers === 3) fare += 10; // add 10 for 3rd passenger
    if (dist > 1) fare += Math.ceil(dist - 1) * 10; // add 10 for each succeeding km
    // Get addresses
    const currentAddr = document.getElementById('currentAddress').textContent;
    const destAddr = document.getElementById('destinationAddress').textContent;
    resultDiv.innerHTML = `
      <div class="route-summary">
        <div class="route-accent"></div>
        <div class="route-point">
          <span class="route-icon start">&#9679;</span>
          <div>
            <div class="route-label">Current Location</div>
            <div class="route-address">${currentAddr}</div>
          </div>
        </div>
        <div class="route-connector">
          <span class="route-line"></span>
          <span class="route-icon trike" title="Tricycle" aria-label="Tricycle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><path d="M3 17V15.5C3 14.12 4.12 13 5.5 13H7V17H3Z" fill="#27ae60"/><rect x="7" y="7" width="10" height="10" rx="2" fill="#eafaf1"/><rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="#27ae60"/><circle cx="7" cy="19" r="2" fill="#27ae60"/><circle cx="17" cy="19" r="2" fill="#27ae60"/></svg>
          </span>
        </div>
        <div class="route-point">
          <span class="route-icon end">&#9679;</span>
          <div>
            <div class="route-label">Destination</div>
            <div class="route-address">${destAddr}</div>
            <div class="distance-below">Distance: ${dist.toFixed(2)} km</div>
          </div>
        </div>
      </div>
      <div class="route-details">
        <div class="fare"><span class="fare-label"></span>₱${fare.toFixed(2)}</div>
      </div>
    `;
    showStep(3);
});
// Step 4: Restart
restartBtn.addEventListener('click', () => {
    // Reset all
    currentCoords = null;
    destinationCoords = null;
    if (currentMap) { currentMap.remove(); currentMap = null; }
    if (destinationMap) { destinationMap.remove(); destinationMap = null; }
    document.getElementById('currentMap').innerHTML = '';
    document.getElementById('destinationMap').innerHTML = '';
    currentMarker = null;
    destinationMarker = null;
    mapsInitialized = [false, false];
    // Disable step buttons until location is set
    toStep3Btn.classList.add('disabled');
    toStep4Btn.classList.add('disabled');
    showStep(0);
});

document.addEventListener('DOMContentLoaded', () => {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = '5%';
}); 