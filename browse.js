// This file contains the logic specifically for the public browse.html page.

// Global state to hold the master list of all crops fetched from the server.
let allFetchedCrops = [];

/**
 * Fetches all available crops from the backend and displays them.
 */
async function loadCrops() {
    console.log("✅ loadCrops() called");
    try {
        const response = await fetch('http://localhost:5000/api/crops');
        if (!response.ok) throw new Error('Failed to fetch crops');

        const crops = await response.json();
          console.log("🌾 Crops fetched from server:", crops);
        allFetchedCrops = crops; // Store in the master list
        renderCrops(allFetchedCrops); // Render all crops initially

    } catch (error) {
        console.error('Error loading crops:', error);
        document.getElementById('cropsGrid').innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load crops. Please try again.</p>`;
    }
}

/**
 * Renders a given list of crop objects to the DOM for the public browse page.
 * @param {Array} cropsToRender - The array of crop objects to display.
 */
function renderCrops(cropsToRender) {
    const cropsGrid = document.getElementById('cropsGrid');
    const resultsCount = document.getElementById('resultsCount');
    const emptyState = document.getElementById('emptyState');

    cropsGrid.innerHTML = ''; // Clear existing crops.

    if (cropsToRender.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (resultsCount) resultsCount.textContent = 'No crops match your filters.';
        cropsGrid.classList.add('hidden'); // Hide the grid
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    cropsGrid.classList.remove('hidden'); // Show the grid
    if (resultsCount) resultsCount.textContent = `Showing ${cropsToRender.length} crops`;

    const wishlist = getWishlist(); // Get current user's wishlist from global script.js
    const imageMap = {
        'organic tomatoes': 'organicTomato.jpg', 'basmati rice': 'basmatiRice.jpg',
        'fresh carrots': 'freshCarrots.jpg', 'green peas': 'greenPeas.jpg',
        'fresh potatoes': 'freshPotatoes.jpg', 'whole wheat': 'wholeWheat.jpg'
    };

    cropsToRender.forEach(crop => {
        const isWishlisted = wishlist.includes(crop._id);
        const staticImage = imageMap[crop.name.toLowerCase()];
        const cropImage = crop.image || staticImage || `https://placehold.co/300x200/a3e635/4d7c0f?text=${encodeURIComponent(crop.name)}`;

        const cropCardHTML = `
            <div class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:-translate-y-1">
                <div class="relative">
                    <img src="${cropImage}" alt="${crop.name}" class="w-full h-48 object-cover bg-gray-100">
                    <button class="absolute top-2 left-2 bg-white/90 p-1 rounded wishlist-btn" data-crop-id="${crop._id}" data-crop-name="${crop.name}">
                        <i class="fas fa-heart px-1 wishlist-icon ${isWishlisted ? 'text-red-500' : 'text-gray-400'}"></i>
                    </button>
                </div>
                <div class="p-4">
                    <div class="flex items-start justify-between mb-2 gap-2">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">${crop.name}</h3>
                            <span class="text-gray-600 text-sm flex items-center gap-1 mt-1">
                                <i class="fa-regular fa-user"></i>${crop.farmerName || 'Unknown Farmer'}
                            </span>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-green-600">₹${crop.price}</div>
                            <div class="text-sm text-gray-600 mb-3">per kg</div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-3 h-10 overflow-hidden">${crop.description || 'Fresh farm produce.'}</p>
                    <div class="space-y-2 text-sm mb-4">
                        <div class="flex items-center justify-between gap-2">
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-map-marker-alt text-gray-400"></i>${crop.location || 'N/A'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-weight text-gray-400"></i>${crop.quantity} kg available</span>
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-layer-group text-gray-400"></i>${crop.category}</span>
                        </div>
                    </div>
                    <button data-action="login" class="mt-4 w-full flex items-center justify-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition duration-300">
                        <i class="fas fa-shopping-cart mr-2"></i>Login to Order
                    </button>
                </div>
            </div>
        `;
        cropsGrid.insertAdjacentHTML('beforeend', cropCardHTML);
    });

    // Add event listeners to the newly created buttons
    cropsGrid.querySelectorAll('[data-action="login"]').forEach(button => {
        button.addEventListener('click', () => {
            showLoginPage('user'); // Directly show the user login page
        });
    });

    // Add event listeners for wishlist buttons
    cropsGrid.querySelectorAll('.wishlist-btn').forEach(button => {
        const cropId = button.dataset.cropId;
        button.addEventListener('click', () => toggleWishlist(cropId, button));
    });
}

/**
 * Sets up event listeners for the crop filtering controls.
 */
function initializeFilters() {
    // Basic filters
    document.getElementById('searchInput').addEventListener('input', filterCrops);
    document.getElementById('cropFilter').addEventListener('change', filterCrops);
    document.getElementById('locationFilter').addEventListener('change', filterCrops);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);

    // Advanced filter toggling
    document.getElementById('filterToggle').addEventListener('click', () => {
        document.getElementById('advancedFilters').classList.toggle('hidden');
    });

    // Advanced filters
    document.getElementById('sortSelect').addEventListener('change', filterCrops);
    document.getElementById('qualityFilter').addEventListener('change', filterCrops);
    document.getElementById('organicFilter').addEventListener('change', filterCrops);
}

document.addEventListener('DOMContentLoaded', () => {
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navSignupBtn = document.getElementById('navSignupBtn');

    if (navLoginBtn) navLoginBtn.addEventListener('click', () => showLoginPage('user'));
    if (navSignupBtn) navSignupBtn.addEventListener('click', () => showSignupPage());
});


/**
 * Filters the visible crop cards based on the current filter values.
 */
function filterCrops() {
    // Get values from all filters
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('cropFilter').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
    const qualityFilter = document.getElementById('qualityFilter').value.toLowerCase();
    const organicFilter = document.getElementById('organicFilter').value; // 'all', 'organic', 'conventional'
    const sortValue = document.getElementById('sortSelect').value;

    let filteredCrops = allFetchedCrops.filter(crop => {
        const cropName = crop.name.toLowerCase();
        const farmerName = (crop.farmerName || '').toLowerCase();
        const cropCategory = (crop.category || '').toLowerCase();
        const cropLocation = (crop.location || '').toLowerCase();
        const cropQuality = (crop.quality || 'standard').toLowerCase();
        // Assuming no specific 'organic' field, we can filter by description or name for now
        const isOrganic = (crop.description.toLowerCase().includes('organic') || crop.name.toLowerCase().includes('organic'));

        const matchesSearch = !searchTerm || cropName.includes(searchTerm) || farmerName.includes(searchTerm);
        const matchesCategory = !categoryFilter || cropCategory === categoryFilter;
        const matchesLocation = locationFilter === 'all' || cropLocation.includes(locationFilter);
        const matchesQuality = qualityFilter === 'all' || cropQuality === qualityFilter;
        const matchesOrganic = organicFilter === 'all' || (organicFilter === 'organic' && isOrganic) || (organicFilter === 'conventional' && !isOrganic);

        return matchesSearch && matchesCategory && matchesLocation && matchesQuality && matchesOrganic;
    });

    // Apply sorting
    switch (sortValue) {
        case 'low-high':
            filteredCrops.sort((a, b) => a.price - b.price);
            break;
        case 'high-low':
            filteredCrops.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
        default:
            filteredCrops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    renderCrops(filteredCrops);
}

/**
 * Resets all filter inputs and re-applies the filter.
 */
function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('cropFilter').value = '';
    document.getElementById('locationFilter').value = 'all';
    document.getElementById('sortSelect').value = 'newest';
    document.getElementById('qualityFilter').value = 'all';
    document.getElementById('organicFilter').value = 'all';
    filterCrops();
}
