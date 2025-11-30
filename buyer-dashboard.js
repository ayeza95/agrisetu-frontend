document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION ---
    // Check if a user is logged in and has the 'buyer' role.
    // If not, deny access and redirect to the homepage.
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'buyer') {
        showNotification("Access denied. Please login as a buyer.", "error");
        setTimeout(() => window.location.href = 'index.html', 1500);
        return; // Stop further execution
    }

    // --- INITIALIZATION ---
    const userWelcomeEl = document.getElementById('userWelcome');
    if(userWelcomeEl) userWelcomeEl.textContent = `Welcome, ${user.name}`;

    // Initialize all the interactive features of the dashboard.
    initializeFilters();
    initializeOrderModal();
    initializeWishlist();
    initializeProfileForm();

    // Load the initial data for the dashboard.
    loadBuyerStats();
    loadCrops();
});

// --- GLOBAL STATE ---
// This variable will hold the details of the crop the user wants to order.
let currentCropForOrder = null;
// This variable will hold the master list of all crops fetched from the server.
let allFetchedCrops = [];
// Flag to track if crops have already been loaded
let cropsAlreadyLoaded = false;
// This variable will hold the ID of the farmer whose crops are currently being filtered.
let currentFarmerFilterId = null;


// --- NAVIGATION ---

/**
 * Manages the visibility of different sections in the dashboard.
 * @param {string} section - The name of the section to show (e.g., 'browse', 'orders').
 * @param {Event} event - The click event from the navigation button.
 */
function showSection(section, event) {
    if (event) event.preventDefault();
    
    // Hide all main dashboard sections.
    const sections = ['browse', 'orders', 'farmers', 'wishlist', 'profile'];
    sections.forEach(sec => {
        const element = document.getElementById(sec + 'Section');
        if (element) element.classList.add('hidden');
    });
    
    // Show the target section.
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) targetSection.classList.remove('hidden');
    
    // Also hide the payment section if it's visible
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) paymentSection.classList.add('hidden');

    // Update the active state of the navigation buttons.
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#2d5016]', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    if (event && event.target) {
        event.target.classList.remove('bg-gray-200', 'text-gray-700');
        event.target.classList.add('bg-[#2d5016]', 'text-white');
    }

    // Load data for the selected section. This is efficient as data is only fetched when needed.
    switch (section) {
        case 'browse':
            loadCrops();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'farmers':
            loadFarmers();
            break;
        case 'wishlist':
            loadWishlistItems();
            break;
        case 'profile':
            loadProfileData();
            break;
    }
}

// --- DATA FETCHING & RENDERING ---

/**
 * Fetches all available crops from the backend and displays them.
 */
async function loadCrops() {
    // If crops are already loaded, don't load them again
    if (cropsAlreadyLoaded) {
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/crops');
        if (!response.ok) throw new Error('Failed to fetch crops');

        const crops = await response.json();

        // The backend now populates the farmer details, so we can simplify this.
        // The `populate` in cropRoutes.js handles sending the farmer object with the name.
        // Example: .populate({path: 'farmer', select: 'name phone'});
        // This ensures crop.farmer is an object like { _id: '...', name: '...', phone: '...' }
        //
        // The previous complex logic to re-fetch farmers is no longer needed if the backend is correct.
        // We will trust the backend's populated data.
        // Let's add a console log to verify the data structure from the API.
        console.log("Crops received from API:", crops);

        allFetchedCrops = crops; // Store in the master list
        renderCrops(allFetchedCrops); // Render all crops initially

        // Set the flag to true so crops are not loaded again
        cropsAlreadyLoaded = true;

    } catch (error) {
        console.error('Error loading crops:', error);
        document.getElementById('cropsGrid').innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load crops. Please try again.</p>`;
    }
}


/**
 * Renders a given list of crop objects to the DOM.
 * @param {Array} cropsToRender - The array of crop objects to display.
 */
function renderCrops(cropsToRender) {
    const cropsGrid = document.getElementById('cropsGrid');
    const resultsCount = document.getElementById('resultsCount');
    const emptyState = document.getElementById('emptyState');
    const loadMoreButton = document.getElementById('loadMoreCrops');
    
    cropsGrid.innerHTML = ''; // Clear existing crops.

    if (cropsToRender.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (resultsCount) resultsCount.textContent = '0 crops found'; // Cleaner message
        if (loadMoreButton) loadMoreButton.classList.add('hidden'); // Hide load more button
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (loadMoreButton) loadMoreButton.classList.remove('hidden'); // Show load more button
    if (resultsCount) resultsCount.textContent = `Showing ${cropsToRender.length} crops`;

    const wishlist = getWishlist();
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
                    <div class="absolute top-2 right-2 flex gap-2">
                        <span class="bg-green-600 text-white text-xs px-2 py-1 rounded">${crop.quality || 'Standard'}</span>
                    </div>
                    <button class="absolute top-2 left-2 bg-white/90 p-1 rounded wishlist-btn" onclick="toggleWishlist('${crop._id}', this)">
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
                    <p class="text-sm text-gray-600 mb-3 h-10 overflow-hidden">${crop.description || 'Fresh farm produce, harvested with care.'}</p>
                    <div class="space-y-2 text-sm mb-4">
                        <div class="flex items-center justify-between gap-2">
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-map-marker-alt text-gray-400"></i>${crop.location}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-weight text-gray-400"></i>${crop.quantity} kg available</span>
                            <span class="flex items-center gap-1 text-gray-600"><i class="fas fa-layer-group text-gray-400"></i>${crop.category}</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick='openOrderModal(${JSON.stringify(crop)})' class="flex-1 flex items-center justify-center bg-green-600 text-white py-2 rounded hover:bg-green-700 transition duration-300">
                            <i class="fas fa-shopping-cart mr-2"></i>Order Now
                        </button>
                        <button onclick="showPhoneNumber('${crop.farmer?.phone || 'Not Available' }')" class="flex items-center justify-center px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-300">
                            <i class="fas fa-phone mr-2"></i>Mob
                        </button>
                    </div>
                </div>
            </div>
        `;
        cropsGrid.innerHTML += cropCardHTML;
    });
}

/**
 * Fetches and displays the buyer's order history.
 */
async function loadOrders() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:5000/api/orders/buyer/${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch orders');

        const orders = await response.json();
        const ordersTableBody = document.getElementById('ordersTableBody');
        ordersTableBody.innerHTML = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">You have not placed any orders yet.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const statusColors = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'confirmed': 'bg-blue-100 text-blue-800',
                'shipped': 'bg-purple-100 text-purple-800',
                'delivered': 'bg-green-100 text-green-800',
                'cancelled': 'bg-red-100 text-red-800'
            };
            const orderRowHTML = `
                <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium text-gray-900">${order._id.slice(-8)}</td>
                    <td class="py-3 px-4 text-gray-900">${order.cropName}</td>
                    <td class="py-3 px-4 text-gray-600">${order.farmerName}</td>
                    <td class="py-3 px-4 text-gray-600">${order.quantity} kg</td>
                    <td class="py-3 px-4 text-green-600 font-semibold">₹${order.totalAmount}</td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-1 text-xs rounded-full ${statusColors[order.status] || ''}">${order.status}</span>
                    </td>
                    <td class="py-3 px-4 text-gray-500 text-sm">${new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
            `;
            ordersTableBody.innerHTML += orderRowHTML;
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersTableBody').innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">Failed to load orders.</td></tr>`;
    }
}

/**
 * Fetches and displays a list of all registered farmers.
 */
async function loadFarmers() {
    try {
        const response = await fetch('http://localhost:5000/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');

        const allUsers = await response.json();
        // Filter for only sellers who are also verified
        const verifiedFarmers = allUsers.filter(user => user.role === 'seller' && user.isVerified);
        const farmersGrid = document.getElementById('farmersGrid');
        farmersGrid.innerHTML = '';

        if (verifiedFarmers.length === 0) {
            farmersGrid.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500">No verified farmers are available at the moment.</p>`;
            return;
        }

        verifiedFarmers.forEach(farmer => {
            const farmerCardHTML = `
                <div class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:-translate-y-1">
                    <div class="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i class="fas fa-user-tie text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 text-center">${farmer.name}</h3>
                    <p class="${farmer.isVerified ? 'text-green-600' : 'text-yellow-600'} text-sm text-center mt-1 font-semibold">
                        <i class="fas ${farmer.isVerified ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>
                        ${farmer.isVerified ? 'Verified Farmer' : 'Pending Verification'}
                    </p>
                    <div class="mt-4 space-y-2 text-sm text-gray-600">
                        <p class="flex items-center gap-2"><i class="fas fa-phone text-gray-400 w-4"></i><span>${farmer.phone || 'Not provided'}</span></p>
                        <p class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-gray-400 w-4"></i><span>${farmer.farmerDetails?.village || 'Location not set'}</span></p>
                    </div>
                    <button onclick="viewFarmerCrops('${farmer._id}', '${farmer.name}')" class="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition duration-300 font-semibold">
                        <i class="fas fa-seedling mr-2"></i>View Crops
                    </button>
                </div>
            `;
            farmersGrid.innerHTML += farmerCardHTML;
        });
    } catch (error) {
        console.error('Error loading farmers:', error);
        document.getElementById('farmersGrid').innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load farmers.</p>`;
    }
}

/**
 * Filters crops to display only those from a specific farmer.
 * @param {string} farmerId - The ID of the farmer.
 * @param {string} farmerName - The name of the farmer (for display).
 */
function viewFarmerCrops(farmerId, farmerName) {
    currentFarmerFilterId = farmerId; // Set the global filter variable
    showSection('browse'); // Switch to the browse section
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = `Farmer: ${farmerName}`; // Update search input for UX
    filterCrops(); // Trigger the filter function to re-render crops
    showNotification(`Showing crops from ${farmerName}`, 'info');
}

/**
 * Fetches and displays the buyer's key statistics.
 */
async function loadBuyerStats() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:5000/api/orders/buyer/${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const orders = await response.json();
        
        const totalOrders = orders.length;
        const completedOrders = orders.filter(order => order.status === 'delivered').length;
        const pendingOrders = orders.filter(order => ['pending', 'confirmed', 'shipped'].includes(order.status)).length;
        const totalSpent = orders.filter(order => order.status === 'delivered').reduce((sum, order) => sum + order.totalAmount, 0);

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalSpent').textContent = `₹${totalSpent.toFixed(2)}`;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('completedOrders').textContent = completedOrders;

    } catch (error) {
        console.error('Error loading buyer stats:', error);
    }
}

// --- INTERACTIVITY & EVENT HANDLERS ---

/**
 * Sets up event listeners for the crop filtering controls.
 */
function initializeFilters() {
    document.getElementById('searchInput').addEventListener('input', filterCrops);
    document.getElementById('cropFilter').addEventListener('change', filterCrops);
    document.getElementById('locationFilter').addEventListener('change', filterCrops);
    document.getElementById('sortSelect').addEventListener('change', filterCrops);
    document.getElementById('qualityFilter').addEventListener('change', filterCrops);
    document.getElementById('organicFilter').addEventListener('change', filterCrops);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('clearFiltersEmptyState').addEventListener('click', clearAllFilters); // Add listener for the new button

    // Advanced filter toggling
    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            document.getElementById('advancedFilters').classList.toggle('hidden');
        });
    }
}

/**
 * Filters the visible crop cards based on the current filter values.
 */
function filterCrops() {
    const sortValue = document.getElementById('sortSelect').value;
    let filteredCrops;

    // **PRIORITY 1: Check if we are filtering by a specific farmer.**
    if (currentFarmerFilterId) {
        // If a farmer filter is active, ONLY filter by that farmer's ID.
        filteredCrops = allFetchedCrops.filter(crop => {
            const cropFarmerId = crop.farmer?._id || crop.farmer;
            return cropFarmerId && cropFarmerId.toString() === currentFarmerFilterId.toString();
        });
    } else {
        // **PRIORITY 2: If no farmer filter, apply all other general filters.**
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('cropFilter').value.toLowerCase();
        const locationFilter = document.getElementById('locationFilter').value.toLowerCase();
        const qualityFilter = document.getElementById('qualityFilter').value.toLowerCase();
        const organicFilter = document.getElementById('organicFilter').value;

        filteredCrops = allFetchedCrops.filter(crop => {
            const cropName = crop.name.toLowerCase();
            const farmerName = (crop.farmer?.name || crop.farmerName || '').toLowerCase();
            const cropCategory = (crop.category || '').toLowerCase();
            const cropLocation = (crop.location || '').toLowerCase();
            const cropQuality = (crop.quality || 'standard').toLowerCase();
            const isOrganic = (crop.description?.toLowerCase().includes('organic') || crop.name.toLowerCase().includes('organic'));

            const matchesSearch = !searchTerm || cropName.includes(searchTerm) || farmerName.includes(searchTerm);
            const matchesCategory = !categoryFilter || cropCategory === categoryFilter;
            const matchesLocation = locationFilter === 'all' || cropLocation.includes(locationFilter);
            const matchesQuality = qualityFilter === 'all' || cropQuality === qualityFilter;
            const matchesOrganic = organicFilter === 'all' || (organicFilter === 'organic' && isOrganic) || (organicFilter === 'conventional' && !isOrganic);

            return matchesSearch && matchesCategory && matchesLocation && matchesQuality && matchesOrganic;
        });
    }

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
            // Assumes a 'createdAt' field from the backend.
            filteredCrops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    // Update the sort status text display
    const sortStatusText = document.getElementById('sortStatusText');
    if (sortStatusText) {
        const sortTextMap = {
            'newest': 'Sorted by newest',
            'low-high': 'Sorted by price: Low to High',
            'high-low': 'Sorted by price: High to Low',
            'rating': 'Sorted by highest rated'
        };
        sortStatusText.textContent = sortTextMap[sortValue] || 'Sorted by newest';
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
    
    // Clear the farmer-specific filter
    currentFarmerFilterId = null;
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.startsWith('Farmer: ')) {
        searchInput.value = ''; // Clear the farmer name from search input
    }
    filterCrops();
}

/**
 * Sets up event listeners for the order modal form.
 */
function initializeOrderModal() {
    const orderQuantityInput = document.getElementById('orderQuantity');
    const orderForm = document.getElementById('orderForm');

    // Calculate total price in real-time as quantity changes.
    if (orderQuantityInput) {
        orderQuantityInput.addEventListener('input', function() {
            if (currentCropForOrder && this.value > 0) {
                const total = parseInt(this.value) * currentCropForOrder.price;
                document.getElementById('orderTotal').innerHTML = `<div class="flex justify-between text-lg font-semibold"><span>Total:</span><span class="text-green-600">₹${total}</span></div>`;
            } else {
                document.getElementById('orderTotal').innerHTML = '';
            }
        });
    }

    // Handle the order form submission.
    if (orderForm) {
        orderForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const quantity = parseInt(document.getElementById('orderQuantity').value);
            const deliveryAddress = document.getElementById('orderAddress').value;
            const specialInstructions = document.getElementById('orderInstructions').value;

            if (!quantity || quantity <= 0) return showNotification('Please enter a valid quantity.', 'error');
            if (quantity > currentCropForOrder.quantity) return showNotification(`Only ${currentCropForOrder.quantity} kg available.`, 'error');
            if (!deliveryAddress.trim()) return showNotification('Please enter a delivery address.', 'error');

            // Prepare order details to pass to the payment page
            currentCropForOrder.quantity = quantity;
            currentCropForOrder.deliveryAddress = deliveryAddress;
            currentCropForOrder.specialInstructions = specialInstructions;
            
            // Save to localStorage and redirect to the payment page
            localStorage.setItem('currentOrder', JSON.stringify(currentCropForOrder));
            window.location.href = 'payment.html';
        });
    }
}

/**
 * Opens the order modal and populates it with the selected crop's data.
 * @param {object} crop - The full crop object.
 */
function openOrderModal(crop) {
    if (!crop || !crop._id) return showNotification('Crop details not found.', 'error');

    currentCropForOrder = {
        id: crop._id,
        name: crop.name,
        price: crop.price,
        farmerName: crop.farmer?.name || 'Unknown Farmer',
        quantity: crop.quantity
    };

    // Populate modal with crop details.
    document.getElementById('orderCropDetails').innerHTML = `
        <div class="bg-gray-100 p-4 rounded-lg border">
            <h4 class="font-semibold text-gray-900">${crop.name}</h4>
            <div class="flex justify-between text-sm text-gray-600 mt-2">
                <span>Price: ₹${crop.price}/kg</span>
                <span>Available: ${crop.quantity} kg</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">Farmer: ${crop.farmerName}</p>
        </div>
    `;

    // Reset form and show modal.
    document.getElementById('orderForm').reset();
    document.getElementById('orderTotal').innerHTML = '';
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.address) {
        document.getElementById('orderAddress').value = user.address;
    }
    document.getElementById('orderModal').classList.remove('hidden');
    // Prevent background scroll when modal is open
    document.body.style.overflow = 'hidden';
}

/**
 * Hides all main sections and shows the integrated payment section.
 * @param {object} orderDetails - The details of the crop to be purchased.
 */
function showPaymentSection(orderDetails) {
    // Hide all main dashboard sections
    const sections = ['browse', 'orders', 'farmers', 'wishlist', 'profile'];
    sections.forEach(sec => {
        const element = document.getElementById(sec + 'Section');
        if (element) element.classList.add('hidden');
    });

    // Show the payment section
    const paymentSection = document.getElementById('paymentSection');
    paymentSection.classList.remove('hidden');

    // Reset payment UI state
    document.getElementById('paymentOptionsContainer').classList.remove('hidden');
    document.getElementById('orderSummary').classList.remove('hidden');
    document.getElementById('paymentTitle').classList.remove('hidden');
    document.getElementById('paymentSuccess').classList.add('hidden');

    const orderSummary = document.getElementById('orderSummary');
    const payButton = document.getElementById('payButton');
    const totalAmount = orderDetails.price * orderDetails.quantity;

    // Display order summary
    orderSummary.innerHTML = `
        <h4 class="font-semibold text-gray-900">${orderDetails.name}</h4>
        <p class="text-gray-600">Price: ₹${orderDetails.price}/kg</p>
        <p class="text-gray-600">Quantity: ${orderDetails.quantity} kg</p>
        <p class="text-gray-600">Farmer: ${orderDetails.farmerName}</p>
        <p class="font-bold text-lg text-gray-800 mt-2">Total Amount: ₹${totalAmount.toFixed(2)}</p>
    `;

    // The pay button listener needs to be specific to this one-time action.
    // Clone and replace to remove any old event listeners.
    const newPayButton = payButton.cloneNode(true);
    payButton.parentNode.replaceChild(newPayButton, payButton);
    newPayButton.addEventListener('click', () => handlePayment(orderDetails, totalAmount));
}

/**
 * Handles the final order submission after payment simulation.
 * @param {object} orderDetails - The complete details of the order.
 * @param {number} totalAmount - The calculated total amount for the order.
 */
async function handlePayment(orderDetails, totalAmount) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert('User session expired. Please log in again.');

    try {
        const response = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cropId: orderDetails.id,
                quantity: orderDetails.quantity,
                deliveryAddress: orderDetails.deliveryAddress,
                specialInstructions: orderDetails.specialInstructions,
                buyerId: user.id,
                buyerName: user.name
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to place order');

        // Show success screen
        document.getElementById('paymentOptionsContainer').classList.add('hidden');
        document.getElementById('orderSummary').classList.add('hidden');
        document.getElementById('paymentTitle').classList.add('hidden');

        const paymentSuccessDiv = document.getElementById('paymentSuccess');
        paymentSuccessDiv.classList.remove('hidden');
        paymentSuccessDiv.innerHTML = `
            <i class="fas fa-check-circle text-5xl text-green-600 mb-4"></i>
            <h3 class="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h3>
            <p class="text-gray-600">An amount of <strong class="text-green-700">₹${totalAmount.toFixed(2)}</strong> has been processed.
            <br>Your order for <strong>${orderDetails.quantity}kg of ${orderDetails.name}</strong> has been placed successfully.</p>
            <button onclick="showSection('orders', event)" class="inline-block mt-4 bg-[#2d5016] text-white px-6 py-3 rounded-lg hover:bg-[#166534] transition duration-300">View My Orders</button>
        `;
    } catch (error) {
        console.error('Order placement error:', error);
        alert(`Order failed: ${error.message}`);
    }
}

/**
 * Displays the farmer's phone number in a notification.
 * @param {string} phone - The phone number to display.
 */
function showPhoneNumber(phone) {
    showNotification(`Farmer's contact: ${phone}`, 'info');
}

// --- WISHLIST MANAGEMENT ---

/**
 * Initializes wishlist functionality.
 */
function initializeWishlist() {
    // This function can be expanded if more setup is needed for the wishlist.
}

/**
 * Retrieves the current wishlist from localStorage.
 * @returns {string[]} An array of crop IDs.
 */
function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
}

/**
 * Saves the updated wishlist to localStorage.
 * @param {string[]} wishlist - An array of crop IDs.
 */
function saveWishlist(wishlist) {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

/**
 * Adds or removes a crop from the wishlist and updates the UI.
 * @param {string} cropId - The ID of the crop to toggle.
 * @param {HTMLElement} buttonElement - The button element that was clicked.
 */
function toggleWishlist(cropId, buttonElement) {
    let wishlist = getWishlist();
    const icon = buttonElement.querySelector('.wishlist-icon');
    const cropName = buttonElement.closest('.bg-white').querySelector('h3').textContent;

    if (wishlist.includes(cropId)) {
        // Remove from wishlist
        wishlist = wishlist.filter(id => id !== cropId);
        icon.classList.remove('text-red-500');
        icon.classList.add('text-gray-400');
        showNotification(`${cropName} removed from wishlist`);
    } else {
        // Add to wishlist
        wishlist.push(cropId);
        icon.classList.add('text-red-500');
        icon.classList.remove('text-gray-400');
        showNotification(`${cropName} added to wishlist`, 'success');
    }

    saveWishlist(wishlist);

    // If the wishlist section is currently visible, refresh it.
    if (!document.getElementById('wishlistSection').classList.contains('hidden')) {
        loadWishlistItems();
    }
}

/**
 * Fetches the details of wishlisted crops and displays them.
 */
async function loadWishlistItems() {
    const wishlistGrid = document.getElementById('wishlistGrid');
    const wishlist = getWishlist();

    if (wishlist.length === 0) {
        wishlistGrid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">Your wishlist is empty.</div>`;
        return;
    }

    try {
        // A more efficient approach would be to send the array of IDs to the backend.
        // For now, we fetch all crops and filter client-side.
        const response = await fetch('http://localhost:5000/api/crops');
        const allCrops = await response.json();
        const wishlistedCrops = allCrops.filter(crop => wishlist.includes(crop._id));
        
        const imageMap = {
            'organic tomatoes': 'organicTomato.jpg',
            'basmati rice': 'basmatiRice.jpg',
            'fresh carrots': 'freshCarrots.jpg',
            'green peas': 'greenPeas.jpg',
            'fresh potatoes': 'freshPotatoes.jpg',
            'whole wheat': 'wholeWheat.jpg'
        };

        wishlistGrid.innerHTML = '';
        wishlistedCrops.forEach(crop => {
            const staticImage = imageMap[crop.name.toLowerCase()];
            const cropImage = crop.image || staticImage || `https://placehold.co/300x200/a3e635/4d7c0f?text=${encodeURIComponent(crop.name)}`;
            const cropCardHTML = `
                <div class="bg-white rounded-lg overflow-hidden shadow-md" data-crop-id="${crop._id}">
                    <div class="relative">
                        <img src="${cropImage}" alt="${crop.name}" class="w-full h-48 object-cover bg-gray-100" onerror="this.src='https://placehold.co/300x200/eab308/854d0e?text=Image+Error'">
                        <button class="absolute top-2 left-2 bg-white/90 p-1 rounded" onclick="toggleWishlist('${crop._id}', this)">
                            <i class="fas fa-heart px-1 wishlist-icon text-red-500"></i>
                        </button>
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold text-gray-900 truncate pr-2">${crop.name}</h3>
                            <div class="text-xl font-bold text-green-600 whitespace-nowrap">₹${crop.price}</div>
                        </div>
                        <button onclick='openOrderModal(${JSON.stringify(crop)})' class="w-full flex items-center justify-center bg-green-600 text-white py-2 rounded hover:bg-green-700">
                            <i class="fas fa-shopping-cart mr-2"></i>Order Now
                        </button>
                    </div>
                </div>
            `;
            wishlistGrid.innerHTML += cropCardHTML;
        });

    } catch (error) {
        console.error('Error loading wishlist items:', error);
        wishlistGrid.innerHTML = '<p class="text-red-500">Could not load wishlist items.</p>';
    }
}

// --- PROFILE MANAGEMENT ---

/**
 * Sets up the event listener for the profile update form.
 */
function initializeProfileForm() {
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
}

/**
 * Loads the current user's data into the profile form fields.
 */
function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileAddress').value = user.address || '';
    }
}

/**
 * Handles the submission of the profile update form.
 * @param {Event} event - The form submission event.
 */
async function updateProfile(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const updatedData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value,
        address: document.getElementById('profileAddress').value
    };

    // Phone number validation
    if (!/^\d{10}$/.test(updatedData.phone)) {
        showNotification("Please enter a valid 10-digit phone number.", "error");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to update profile');

        // The backend returns the complete, updated user object.
        // We must ensure the 'id' field (which the frontend uses) is consistent with '_id' from the backend.
        const finalUpdatedUser = result.user;
        finalUpdatedUser.id = finalUpdatedUser._id; // Add the 'id' property for frontend consistency.

        // Save the complete and correct user object back to localStorage.
        localStorage.setItem('user', JSON.stringify(finalUpdatedUser));

        showNotification('Profile updated successfully!', 'success');
        document.getElementById('userWelcome').textContent = `Welcome, ${finalUpdatedUser.name}`;
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification(`Update failed: ${error.message}`, 'error');
    }
}

/**
 * Hides a modal by its ID.
 * @param {string} modalId - The ID of the modal to close.
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    // Restore background scroll when modal is closed
    document.body.style.overflow = 'auto';
}

function logout() {
    localStorage.removeItem('user');
    showNotification('You have been logged out.', 'info');
    setTimeout(() => window.location.href = 'index.html', 1500);
}