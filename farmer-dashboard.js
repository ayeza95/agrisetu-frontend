// farmer-dashboard.js

const CLOUDINARY_CLOUD_NAME = 'dxzxlci6n'; 
const CLOUDINARY_UPLOAD_PRESET = 'ayeza24';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'seller') {
        // Use a notification before redirecting
        showNotification("Access denied. Please login as a farmer.", "error");
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    // Update welcome message
    const userWelcomeEl = document.getElementById('userWelcome');
    if(userWelcomeEl) userWelcomeEl.textContent = `Welcome, ${user.name}`;

    // Load farmer's data
    loadFarmerCrops();
    loadFarmerStats();
    loadFarmerOrders();

    // Form submission for adding crops
    const addCropForm = document.getElementById('addCropForm');
    if (addCropForm) {
        addCropForm.addEventListener('submit', function(event) {
            addNewCrop(event);
        });
    }

    // Set max date for the harvest date input to today
    const harvestDateInput = document.getElementById('cropHarvestDate');
    if (harvestDateInput) {
        const today = new Date().toISOString().split('T')[0];
        harvestDateInput.setAttribute('max', today);
    }

    initializeProfileForm();

    // Edit crop form submission
    const editCropForm = document.getElementById('editCropForm');
    if (editCropForm) {
        editCropForm.addEventListener('submit', updateCrop);
    }
});

// Navigation function
function showSection(section, event) {
    if (event) event.preventDefault();
    
    // Hide all sections
    const sections = ['crops', 'orders', 'profile'];
    sections.forEach(sec => {
        const element = document.getElementById(sec + 'Section');
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show target section
    const target = document.getElementById(section + 'Section');
    if (target) {
        target.classList.remove('hidden');
    }
    
    // Update button styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#2d5016]', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    // Activate clicked button
    if (event && event.target) {
        event.target.classList.remove('bg-gray-200', 'text-gray-700');
        event.target.classList.add('bg-[#2d5016]', 'text-white');
    }

    // Load data for specific sections
    if (section === 'crops') {
        loadFarmerCrops();
    } else if (section === 'orders') {
        loadFarmerOrders();
    } else if (section === 'profile') {
        loadProfileData();
    }
}

// Load farmer's crops
async function loadFarmerCrops() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:5000/api/crops/farmer/${user.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const crops = await response.json();
        const cropsTableBody = document.getElementById('cropsTableBody');
        
        if (crops.length === 0) {
            cropsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        <i class="fas fa-seedling text-4xl mb-4 text-gray-300"></i>
                        <p>No crops listed yet</p>
                        <p class="text-sm mt-2">Add your first crop to start selling</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Map crop names to your static image files as a fallback.
        const imageMap = {
            'wheat': 'wholeWheat.jpg',
            'rice': 'basmatiRice.jpg',
            'carrots': 'freshCarrots.jpg',
            'peas': 'greenPeas.jpg',
            'potatoes': 'freshPotatoes.jpg',
            'tomatoes': 'organicTomato.jpg'
        };

        cropsTableBody.innerHTML = crops.map(crop => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="py-3 px-4">
                    <img src="${crop.image || 'https://via.placeholder.com/48?text=No+Image'}" alt="${crop.name}" class="w-12 h-12 object-cover rounded-md">
                </td>
                <td class="py-3 px-4 font-medium text-gray-900">${crop.name}</td>
                <td class="py-3 px-4 text-gray-600">${crop.category}</td>
                <td class="py-3 px-4 text-gray-600">${crop.quantity} kg</td>
                <td class="py-3 px-4 text-green-600 font-semibold">₹${crop.price}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${
                        crop.status === 'available' ? 'bg-green-100 text-green-800' : 
                        crop.status === 'sold_out' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                    }">
                        ${crop.status}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex gap-2">
                        <!--<button onclick="editCrop('${crop._id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>-->
                        <button onclick="deleteCrop('${crop._id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading farmer crops:', error);
        const cropsTableBody = document.getElementById('cropsTableBody');
        cropsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load crops</p>
                    <p class="text-sm mt-2">Please check your connection</p>
                </td>
            </tr>
        `;
    }
}


/**
 * @function addNewCrop
 */
async function addNewCrop(event) {
    event.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    const addCropForm = document.getElementById('addCropForm');
    
    // Retrieve form field values (using the input IDs)
    const cropName = document.getElementById('cropName').value;
    const cropCategory = document.getElementById('cropCategory').value;
    const cropPrice = parseFloat(document.getElementById('cropPrice').value);
    const cropQuantity = parseInt(document.getElementById('cropQuantity').value);
    const cropDescription = document.getElementById('cropDescription').value;
    const cropQuality = document.getElementById('cropQuality').value;
    const cropHarvestDate = document.getElementById('cropHarvestDate').value;
    const cropImageFile = document.getElementById('cropImage').files[0];

    let imageUrl = ''; // Initialize imageUrl

    if (cropImageFile) {
        showNotification('Uploading image to Cloudinary...', 'info');

        
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', cropImageFile);
        
        cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 

        
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        try {
            const imageUploadResponse = await fetch(cloudinaryUrl, {
                method: 'POST',
                body: cloudinaryFormData
            });

            if (!imageUploadResponse.ok) {
                const errorData = await imageUploadResponse.json();
                throw new Error(errorData.error?.message || 'Cloudinary upload failed.');
            }

            const imageUploadData = await imageUploadResponse.json();
            imageUrl = imageUploadData.secure_url;
            showNotification('Image uploaded successfully!', 'success');

        } catch (error) {
            console.error('Cloudinary upload error:', error);
            showNotification(`Image upload failed: ${error.message}`, 'error');
            return; // Stop the entire process if image upload fails
        }
    }
    
    // 3. Prepare JSON data to send to local backend
    const cropData = {
        name: cropName,
        category: cropCategory,
        price: cropPrice, 
        quantity: cropQuantity,
        description: cropDescription,
        quality: cropQuality,
        harvestDate: cropHarvestDate,
        farmerId: user.id,
        farmerName: user.name,
        location: user.farmerDetails?.village || 'Farm Location',
        imageUrl: imageUrl // Add the secure URL here
    };

    try {
        // 4. Send JSON data to your local backend
        const response = await fetch('http://localhost:5000/api/crops', {
            method: 'POST',
            // Set Content-Type: application/json for JSON payload
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cropData),
            
        });
        console.log(cropData);

        if (response.ok) {
            showNotification('Crop added successfully!', 'success');
            closePage('addCropPage');
            addCropForm.reset(); // Reset form after success
            loadFarmerCrops();
            loadFarmerStats();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add crop to database');
        }
    } catch (error) {
        console.error('Error adding crop:', error);
        showNotification(`Failed to add crop: ${error.message}`, 'error');
    }
}


// Load farmer statistics
async function loadFarmerStats() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Fetch crops and orders in parallel
        const [cropsResponse, ordersResponse] = await Promise.all([
            fetch(`http://localhost:5000/api/crops/farmer/${user.id}`),
            fetch(`http://localhost:5000/api/orders/farmer/${user.id}`)
        ]);

        if (!cropsResponse.ok || !ordersResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const crops = await cropsResponse.json();
        const orders = await ordersResponse.json();
        
        // Calculate stats
        const totalCrops = crops.length;
        const totalOrders = orders.length;
        const totalEarnings = orders
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + order.totalAmount, 0);
        const pendingOrders = orders.filter(order => 
            ['pending', 'confirmed', 'shipped'].includes(order.status)
        ).length;
        
        // Update UI
        document.getElementById('totalCrops').textContent = totalCrops;
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalEarnings').textContent = `₹${Math.round(totalEarnings)}`;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        
    } catch (error) {
        console.error('Error loading farmer stats:', error);
        // Set default values
        document.getElementById('totalCrops').textContent = '0';
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('totalEarnings').textContent = '₹0';
        document.getElementById('pendingOrders').textContent = '0';
    }
}

// Load farmer orders with management functionality
async function loadFarmerOrders() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:5000/api/orders/farmer/${user.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const orders = await response.json();
        const ordersTableBody = document.getElementById('ordersTableBody');
        
        if (!ordersTableBody) {
            console.error('Orders table body not found');
            return;
        }
        
        if (orders.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-gray-500">
                        <i class="fas fa-shopping-cart text-4xl mb-4 text-gray-300"></i>
                        <p>No orders yet</p>
                        <p class="text-sm mt-2">Orders will appear here when buyers purchase your crops</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        ordersTableBody.innerHTML = orders.map(order => {
            const statusColors = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'confirmed': 'bg-blue-100 text-blue-800',
                'shipped': 'bg-purple-100 text-purple-800',
                'delivered': 'bg-green-100 text-green-800',
                'cancelled': 'bg-red-100 text-red-800'
            };
            
            const statusOptions = {
                'pending': [
                    { value: 'confirmed', label: 'Confirm Order', class: 'bg-blue-500 hover:bg-blue-600' },
                    { value: 'cancelled', label: 'Cancel Order', class: 'bg-red-500 hover:bg-red-600' }
                ],
                'confirmed': [
                    { value: 'shipped', label: 'Mark as Shipped', class: 'bg-purple-500 hover:bg-purple-600' },
                    { value: 'cancelled', label: 'Cancel Order', class: 'bg-red-500 hover:bg-red-600' }
                ],
                'shipped': [
                    { value: 'delivered', label: 'Mark as Delivered', class: 'bg-green-500 hover:bg-green-600' }
                ],
                'delivered': [],
                'cancelled': []
            };
            
            const currentOptions = statusOptions[order.status] || [];
            
            return `
                <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium text-gray-900">
                        ${order._id.toString().slice(-8)}
                    </td>
                    <td class="py-3 px-4 text-gray-900">
                        <div class="font-semibold">${order.cropName}</div>
                        <div class="text-sm text-gray-500">${order.quantity} kg × ₹${order.cropPrice}/kg</div>
                    </td>
                    <td class="py-3 px-4 text-gray-600">
                        <div class="font-medium">${order.buyerName}</div>
                        ${order.buyer?.phone ? `<div class="text-sm text-gray-500">${order.buyer.phone}</div>` : ''}
                    </td>
                    <td class="py-3 px-4 text-gray-600">
                        <div class="text-sm">${order.deliveryAddress}</div>
                        ${order.specialInstructions ? `
                            <div class="text-xs text-gray-500 mt-1">
                                <strong>Instructions:</strong> ${order.specialInstructions}
                            </div>
                        ` : ''}
                    </td>
                    <td class="py-3 px-4 text-green-600 font-semibold">
                        ₹${order.totalAmount}
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-1 text-xs rounded-full ${statusColors[order.status]}">
                            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-gray-500 text-sm">
                        ${new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td class="py-3 px-4">
                        <div class="flex flex-col gap-1">
                            ${currentOptions.map(option => `
                                <button 
                                    onclick="updateOrderStatus('${order._id}', '${option.value}')"
                                    class="text-xs px-2 py-1 text-white rounded transition-colors ${option.class}"
                                >
                                    ${option.label}
                                </button>
                            `).join('')}
                            ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                                <button 
                                    onclick="viewOrderDetails('${order._id}')"
                                    class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Details
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading farmer orders:', error);
        const ordersTableBody = document.getElementById('ordersTableBody');
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Failed to load orders</p>
                    <p class="text-sm mt-2">Please check your connection</p>
                </td>
            </tr>
        `;
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    showNotification(`Processing order status change to: ${newStatus}`, 'info');

    try {
        const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showNotification(`Order ${newStatus} successfully!`, 'success');
            // Reload orders and stats
            loadFarmerOrders();
            loadFarmerStats();
        } else {
            const result = await response.json();
            throw new Error(result.message || 'Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification(`Failed to update order: ${error.message}`, 'error');
    }
}

// View order details
function viewOrderDetails(orderId) {
    showNotification(`Viewing order details for: ${orderId.slice(-8)}. Detailed view coming soon!`, 'info');

}

// Profile Management
function initializeProfileForm() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateFarmerProfile);
    }
}

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profilePhone').value = user.phone || '';
        // Assuming farmerDetails are stored in the user object in localStorage
        document.getElementById('profileLocation').value = user.farmerDetails?.location || '';
        document.getElementById('profileLandSize').value = user.farmerDetails?.landSize || '';
        document.getElementById('profileCropTypes').value = user.farmerDetails?.cropTypes || '';
    }
}

async function updateFarmerProfile(event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const updatedData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value,
        farmerDetails: {
            location: document.getElementById('profileLocation').value,
            landSize: document.getElementById('profileLandSize').value,
            cropTypes: document.getElementById('profileCropTypes').value
        }
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

        if (!response.ok) {
            throw new Error('Failed to update profile on backend');
        }

        const result = await response.json();

        const finalUpdatedUser = result.user;
        finalUpdatedUser.id = finalUpdatedUser._id; 

       
        localStorage.setItem('user', JSON.stringify(finalUpdatedUser));

        showNotification('Profile updated successfully!', 'success');
        document.getElementById('userWelcome').textContent = `Welcome, ${finalUpdatedUser.name}`;
        
        
        setTimeout(() => {
            
            document.querySelector('.nav-btn').click();
        }, 1000); 

    } catch (error) {
        console.error('Profile update error:', error);
        showNotification(error.message || 'Failed to update profile.', 'error');
    }
}

// Edit crop function
async function editCrop(cropId) {
    try {
        const response = await fetch(`http://localhost:5000/api/crops/${cropId}`);
        if (response.ok) {
            const crop = await response.json();
            
            // Populate edit form
            document.getElementById('editCropId').value = crop._id;
            document.getElementById('editCropName').value = crop.name;
            document.getElementById('editCropCategory').value = crop.category;
            document.getElementById('editCropPrice').value = crop.price;
            document.getElementById('editCropQuantity').value = crop.quantity;
            document.getElementById('editCropDescription').value = crop.description || ''; 
            
            // Show edit modal
            document.getElementById('editCropModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading crop for edit:', error);
        showNotification('Failed to load crop details', 'error');
    }
}

// Update crop
async function updateCrop(event) {
    event.preventDefault();
    
    const cropId = document.getElementById('editCropId').value;
    const formData = {
        name: document.getElementById('editCropName').value,
        category: document.getElementById('editCropCategory').value,
        price: parseFloat(document.getElementById('editCropPrice').value),
        quantity: parseInt(document.getElementById('editCropQuantity').value),
        description: document.getElementById('editCropDescription').value,
    };

    try {
        const response = await fetch(`http://localhost:5000/api/crops/${cropId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showNotification('Crop updated successfully!', 'success');
            closeModal('editCropModal');
            loadFarmerCrops();
            loadFarmerStats();
        } else {
            throw new Error('Failed to update crop');
        }
    } catch (error) {
        console.error('Error updating crop:', error);
        showNotification('Failed to update crop', 'error');
    }
}

// Delete crop
async function deleteCrop(cropId) {
    // showNotification('Proceeding with crop deletion...', 'info');

    try {
        const response = await fetch(`http://localhost:5000/api/crops/${cropId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Crop deleted successfully!', 'success');
            loadFarmerCrops();
            loadFarmerStats();
        } else {
            throw new Error('Failed to delete crop');
        }
    } catch (error) {
        console.error('Error deleting crop:', error);
        showNotification('Failed to delete crop', 'error');
    }
}

// Show add crop page
function showAddCropPage() {
    document.getElementById('addCropPage').classList.remove('hidden');
}

// Close page function
function closePage(pageId) {
    document.getElementById(pageId).classList.add('hidden');
}

// Close modal function
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function logout() {
    localStorage.removeItem('user');
    // Show notification and redirect after a delay.
    showNotification('You have been logged out.', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}