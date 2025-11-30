// admin-dashboard.js

// Global Cache to store fetched users so we can access them in modals without passing huge JSON strings
let cachedUsers = [];
let cachedCrops = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Security Check: Ensure user is an admin
    const userStr = localStorage.getItem('user');
    let user;

    try {
        user = JSON.parse(userStr);
    } catch (e) {
        user = null;
    }

    if (!user || user.role !== 'admin') {
        alert("Access denied. Please login as admin."); // Fallback if showNotification isn't ready
        window.location.href = 'index.html';
        return;
    }

    // Set admin name
    const userWelcomeEl = document.getElementById('userWelcome');
    if(userWelcomeEl) userWelcomeEl.textContent = `Welcome, ${user.name}`;

    // Initial data load for the overview page
    loadAdminStats();
    loadRecentActivity();
    loadPendingApprovals();
});

// --- NAVIGATION ---
function showSection(section, event) {
    if (event) event.preventDefault();
    
    // Hide all sections
    const sections = ['overview', 'farmers', 'crops', 'orders', 'users'];
    sections.forEach(sec => {
        const element = document.getElementById(sec + 'Section');
        if (element) element.classList.add('hidden');
    });
    
    // Show target section
    const target = document.getElementById(section + 'Section');
    if (target) target.classList.remove('hidden');
    
    // Update button styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#2d5016]', 'text-white');
        btn.classList.add('bg-gray-300', 'text-gray-700');
    });
    
    // Activate clicked button
    if (event && event.target) {
        event.target.classList.remove('bg-gray-300', 'text-gray-700');
        event.target.classList.add('bg-[#2d5016]', 'text-white');
    }

    // Load data for selected section
    if (section === 'farmers') loadAllFarmers();
    else if (section === 'crops') loadAllCrops();
    else if (section === 'orders') loadAllOrders();
    else if (section === 'users') loadAllUsers();
}

// --- NOTIFICATION HELPER ---
function showNotification(message, type = 'error') {
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px',
        borderRadius: '8px', color: 'white', zIndex: '9999',
        backgroundColor: type === 'error' ? '#f44336' : (type === 'success' ? '#4CAF50' : '#2196F3'),
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    });

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// --- DATA LOADING FUNCTIONS ---

// 1. Stats
async function loadAdminStats() {
    try {
        const [usersRes, cropsRes, ordersRes] = await Promise.all([
            fetch('http://localhost:5000/api/users'),
            fetch('http://localhost:5000/api/crops'),
            fetch('http://localhost:5000/api/orders')
        ]);
        
        if (!usersRes.ok || !cropsRes.ok || !ordersRes.ok) throw new Error('Failed to fetch stats');

        const users = await usersRes.json();
        const crops = await cropsRes.json();
        const orders = await ordersRes.json();

        // Store for other functions
        cachedUsers = users; 
        cachedCrops = crops;

        const farmers = users.filter(user => user.role === 'seller');
        const buyers = users.filter(user => user.role === 'buyer');
        
        document.getElementById('totalFarmers').textContent = farmers.length;
        document.getElementById('totalBuyers').textContent = buyers.length;
        document.getElementById('totalCrops').textContent = crops.length;
        document.getElementById('totalOrders').textContent = orders.length;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// 2. Farmers
async function loadAllFarmers() {
    try {
        const response = await fetch('http://localhost:5000/api/users');
        const users = await response.json();
        cachedUsers = users; // Update cache

        const farmers = users.filter(user => user.role === 'seller');
        const farmersTableBody = document.getElementById('farmersTableBody');
        
        if (farmers.length === 0) {
            farmersTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">No farmers registered yet</td></tr>`;
            return;
        }
        
        farmersTableBody.innerHTML = farmers.map(farmer => {
            // FIX: Check URLs in farmerDetails
            const isDocComplete = farmer.farmerDetails && 
                                  farmer.farmerDetails.aadharCardUrl && 
                                  farmer.farmerDetails.landDocumentsUrl;

            // FIX: Access location from address object, NOT farmerDetails
            const loc = farmer.address 
                ? `${farmer.address.village || ''}, ${farmer.address.district || ''}` 
                : 'N/A';

            return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium text-gray-900">${farmer.name}</td>
                <td class="py-3 px-4 text-gray-600">${farmer.email}</td>
                <td class="py-3 px-4 text-gray-600">${farmer.phone}</td>
                <td class="py-3 px-4 text-gray-600">${loc}</td>
                <td class="py-3 px-4 text-gray-600">${farmer.farmerDetails?.landSize || 'N/A'} acres</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${farmer.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${farmer.isVerified ? 'Verified' : 'Pending'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex gap-2 items-center">
                        <button onclick="verifyFarmer('${farmer._id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Verify" ${farmer.isVerified ? 'disabled' : ''}>
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button onclick="viewFarmerDetails('${farmer._id}')" class="text-green-600 hover:text-green-800 p-1" title="Docs">
                            <i class="fas fa-file-alt"></i>
                        </button>
                        <button onclick="deleteUser('${farmer._id}')" class="text-red-600 hover:text-red-800 p-1" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
        
    } catch (error) {
        console.error('Error loading farmers:', error);
    }
}

// 3. Crops
async function loadAllCrops() {
    try {
        const response = await fetch('http://localhost:5000/api/crops');
        const crops = await response.json();
        
        const cropsTableBody = document.getElementById('cropsTableBody');
        
        if (crops.length === 0) {
            cropsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500">No crops listed yet</td></tr>`;
            return;
        }
        
        cropsTableBody.innerHTML = crops.map(crop => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="py-3 px-4">
                    <img src="${crop.image || 'https://via.placeholder.com/40x40?text=No+Img'}" class="w-10 h-10 object-cover rounded">
                </td>
                <td class="py-3 px-4 font-medium text-gray-900">${crop.name}</td>
                <td class="py-3 px-4 text-gray-600">${crop.farmer?.name || 'N/A'}</td>
                <td class="py-3 px-4 text-gray-600">${crop.category}</td>
                <td class="py-3 px-4 text-gray-600">${crop.quantity} kg</td>
                <td class="py-3 px-4 text-green-600 font-semibold">₹${crop.price}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${
                        crop.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${crop.status.replace('_', ' ')}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex gap-2">
                        <button onclick="updateCropStatus('${crop._id}', 'available')" class="text-blue-600" title="Approve" ${crop.status === 'available' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="deleteCrop('${crop._id}')" class="text-red-600" title="Delete">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error(error); }
}

// 4. Orders
async function loadAllOrders() {
    try {
        const response = await fetch('http://localhost:5000/api/orders');
        const orders = await response.json();
        const ordersTableBody = document.getElementById('ordersTableBody');
        
        if (orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500">No orders found</td></tr>`;
            return;
        }
        
        const colors = { 'pending': 'bg-yellow-100', 'delivered': 'bg-green-100', 'cancelled': 'bg-red-100' };

        ordersTableBody.innerHTML = orders.map(order => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium text-gray-900">${order._id.slice(-6)}</td>
                <td class="py-3 px-4 text-gray-600">${order.buyer?.name || 'N/A'}</td>
                <td class="py-3 px-4 text-gray-600">${order.farmer?.name || 'N/A'}</td>
                <td class="py-3 px-4 text-gray-600">${order.crop?.name || 'N/A'}</td>
                <td class="py-3 px-4 text-gray-600">${order.quantity}</td>
                <td class="py-3 px-4 text-green-600">₹${order.totalAmount}</td>
                <td class="py-3 px-4"><span class="px-2 py-1 text-xs rounded-full ${colors[order.status] || 'bg-gray-100'}">${order.status}</span></td>
                <td class="py-3 px-4 text-gray-500 text-sm">${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) { console.error(error); }
}

// 5. Users
async function loadAllUsers() {
    try {
        const response = await fetch('http://localhost:5000/api/users');
        const users = await response.json();
        const usersTableBody = document.getElementById('usersTableBody');
        
        if (users.length === 0) return;
        
        usersTableBody.innerHTML = users.map(user => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="py-3 px-4 font-medium text-gray-900">${user.name}</td>
                <td class="py-3 px-4 text-gray-600">${user.email}</td>
                <td class="py-3 px-4 uppercase text-xs font-bold text-gray-500">${user.role}</td>
                <td class="py-3 px-4 text-green-600">Active</td>
                <td class="py-3 px-4 text-gray-500">${new Date(user.createdAt).toLocaleDateString()}</td>
                <td class="py-3 px-4">
                    ${user.role !== 'admin' ? 
                        `<button onclick="deleteUser('${user._id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error(error); }
}

// 6. Pending Approvals (Overview)
async function loadPendingApprovals() {
    try {
        // Fetch fresh pending crops
        const pendingCropsRes = await fetch('http://localhost:5000/api/crops/pending');
        const pendingCrops = await pendingCropsRes.json();

        // Use cached users or fetch if empty
        let users = cachedUsers.length > 0 ? cachedUsers : await (await fetch('http://localhost:5000/api/users')).json();
        
        // Filter pending farmers
        const pendingFarmers = users.filter(user => user.role === 'seller' && !user.isVerified);
        
        const container = document.getElementById('pendingApprovals');
        let content = '';

        pendingFarmers.forEach(farmer => {
            const isDocComplete = farmer.farmerDetails?.aadharCardUrl && farmer.farmerDetails?.landDocumentsUrl;
            if (isDocComplete) {
                content += `
                    <div id="pending-farmer-${farmer._id}" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center"><i class="fas fa-user-clock text-yellow-600 text-sm"></i></div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Verify Farmer</p>
                                <p class="text-xs text-gray-500">${farmer.name}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                             <button onclick="viewFarmerDetails('${farmer._id}')" class="text-blue-600 p-1"><i class="fas fa-file-alt"></i></button>
                             <button onclick="verifyFarmer('${farmer._id}', true)" class="text-green-600 p-1"><i class="fas fa-check-circle"></i></button>
                        </div>
                    </div>
                `;
            }
        });

        pendingCrops.forEach(crop => {
            content += `
                <div id="pending-crop-${crop._id}" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><i class="fas fa-seedling text-blue-600 text-sm"></i></div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">Approve Crop</p>
                            <p class="text-xs text-gray-500">${crop.name} - ${crop.farmer?.name || 'Unknown'}</p>
                        </div>
                    </div>
                    <button onclick="updateCropStatus('${crop._id}', 'available', true)" class="text-green-600 text-sm font-semibold">Approve</button>
                </div>
            `;
        });

        container.innerHTML = content || '<p class="text-center text-gray-500 py-4 text-sm">No pending approvals</p>';

    } catch (e) { console.error(e); }
}

// 7. Recent Activity
async function loadRecentActivity() {
    try {
        const res = await fetch('http://localhost:5000/api/orders');
        const orders = await res.json();
        const recent = orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        
        const container = document.getElementById('recentActivity');
        if (recent.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-4 text-sm">No recent activity</p>';
            return;
        }

        container.innerHTML = recent.map(order => `
            <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><i class="fas fa-shopping-cart text-green-600 text-sm"></i></div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">Order Placed</p>
                    <p class="text-xs text-gray-500">By ${order.buyer?.name} | ₹${order.totalAmount}</p>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}


// --- ACTIONS ---

async function verifyFarmer(id, isOverview = false) {
    if(!confirm("Verify this farmer?")) return;
    try {
        const res = await fetch(`http://localhost:5000/api/users/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ isVerified: true })
        });
        if(res.ok) {
            showNotification('Verified successfully', 'success');
            if(isOverview) document.getElementById(`pending-farmer-${id}`).remove();
            else loadAllFarmers();
        } else throw new Error('Failed');
    } catch(e) { showNotification(e.message, 'error'); }
}

async function deleteUser(id) {
    if(!confirm("Delete user? This cannot be undone.")) return;
    try {
        const res = await fetch(`http://localhost:5000/api/users/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showNotification('User deleted', 'success');
            loadAllFarmers(); loadAllUsers(); loadAdminStats();
        } else throw new Error('Failed');
    } catch(e) { showNotification(e.message, 'error'); }
}

async function updateCropStatus(id, status, isOverview = false) {
    try {
        const res = await fetch(`http://localhost:5000/api/crops/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status })
        });
        if(res.ok) {
            showNotification('Status updated', 'success');
            if(isOverview) document.getElementById(`pending-crop-${id}`).remove();
            else loadAllCrops();
        } else throw new Error('Failed');
    } catch(e) { showNotification(e.message, 'error'); }
}

async function deleteCrop(id) {
    if(!confirm("Delete crop?")) return;
    try {
        const res = await fetch(`http://localhost:5000/api/crops/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showNotification('Crop deleted', 'success');
            loadAllCrops();
        }
    } catch(e) { console.error(e); }
}

// --- MODAL: View Farmer Details ---
function viewFarmerDetails(farmerId) {
    // FIX: Look up the farmer from our global cache instead of passing strings in HTML
    const farmer = cachedUsers.find(u => u._id === farmerId);
    
    if (!farmer || !farmer.farmerDetails) {
        showNotification('Details not found', 'error');
        return;
    }

    const details = farmer.farmerDetails;
    // FIX: Access address correctly
    const address = farmer.address || {}; 
    const fullAddress = `${address.village || ''}, ${address.district || ''}, ${address.state || ''} - ${address.pincode || ''}`;

    const docs = {
        'Profile': details.profilePhotoUrl,
        'Aadhar': details.aadharCardUrl,
        'Land Docs': details.landDocumentsUrl,
        'Passbook': details.bankPassbookUrl
    };

    let docHtml = '';
    for (const [key, url] of Object.entries(docs)) {
        if(url) docHtml += `<li class="flex justify-between items-center p-2 border-b">
            <span class="text-gray-600">${key}</span>
            <a href="${url}" target="_blank" class="text-blue-600 text-sm hover:underline">View <i class="fas fa-external-link-alt"></i></a>
        </li>`;
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-backdrop';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onclick="this.closest('.modal-backdrop').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
            
            <h3 class="text-xl font-bold mb-4 text-[#2d5016]">Farmer Details</h3>
            
            <div class="space-y-2 mb-4 text-sm">
                <p><strong>Name:</strong> ${farmer.name}</p>
                <p><strong>Address:</strong> ${fullAddress}</p>
                <p><strong>Land Size:</strong> ${details.landSize} acres (${details.landType})</p>
                <p><strong>Farming Exp:</strong> ${details.farmingExperience} years</p>
            </div>

            <h4 class="font-semibold border-b pb-2 mb-2">Documents</h4>
            <ul class="space-y-1">${docHtml}</ul>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}