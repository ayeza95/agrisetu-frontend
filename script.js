//script file of index
function showLoginPage(type) {
    document.getElementById("loginPage").classList.remove("hidden");
    const signupPrompt = document.getElementById("signupPrompt");

    let roleSelect = document.getElementById("loginRole");
    if(type === "admin"){
        if (roleSelect) roleSelect.style.display = "none";
        if (roleSelect) document.getElementById("loginRole").required = false;
        if (signupPrompt) signupPrompt.classList.add("hidden");
    }
    else{
        if (roleSelect) roleSelect.style.display = "block";
        if (signupPrompt) signupPrompt.classList.remove("hidden");
    }
}

document.addEventListener("DOMContentLoaded", function(){
    // Handle contact page hash
    if(window.location.hash === "#contactPage"){
        showContactPage();
    }

    // Check login status and update navbar
    updateNavbar();

    // --- TERMS AND CONDITIONS LOGIC ---
    const signupTermsCheckbox = document.getElementById("signupTerms");
    const createAccountBtn = document.getElementById("createAccountBtn");
    const acceptTermsCheckbox = document.getElementById("accept-terms");
    const continueBtn = document.getElementById("continueBtn");

    // Enable/disable "Create Account" button on signup form
    signupTermsCheckbox.addEventListener('change', () => {
        createAccountBtn.disabled = !signupTermsCheckbox.checked;
    });

    // Enable/disable "Continue" button on terms page
    acceptTermsCheckbox.addEventListener('change', () => {
        continueBtn.disabled = !acceptTermsCheckbox.checked;
    });

    // --- REDIRECT TO FARMER REGISTRATION ---
    const signupRoleSelect = document.getElementById("signupRole");
    signupRoleSelect.addEventListener('change', () => {
        if (signupRoleSelect.value === 'seller') {
            // Save current form data to localStorage
            const tempFarmerData = {
                name: document.getElementById("signupName").value,
                email: document.getElementById("signupEmail").value,
                phone: document.getElementById("signupPhone").value,
                password: document.getElementById("signupPassword").value,
            };
            
            // Only save if at least one field has data
            if (Object.values(tempFarmerData).some(val => val !== '')) {
                localStorage.setItem('tempFarmerReg', JSON.stringify(tempFarmerData));
            }

            window.location.href = 'farmer-registration.html';
        }
    });

    // Signup form submission
    const signupForm = document.getElementById("signupForm");
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault(); // Prevent default form submission

        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const phone = document.getElementById("signupPhone").value;
        const password = document.getElementById("signupPassword").value;
        const role = document.getElementById("signupRole").value;
        const terms = document.getElementById("signupTerms").checked;

        // Phone number validation
        if (!/^\d{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }

        if (!terms) {
            alert("You must agree to the Terms and Conditions to sign up.");
            return; // Stop the function if terms are not agreed to
        }

        try {
            const response = await fetch('http://localhost:5000/api/users/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, phone, role }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Signup successful:", data);
                showNotification(data.message, 'success'); // "User created successfully!"
                closePage('signupPage'); 
                signupForm.reset(); 
            } else {
                console.error("Signup failed:", data);
                // Show error message from backend
                showNotification(`Error: ${data.message || 'Something went wrong.'}`, 'error');
            }
        } catch (error) {
            console.error('Signup failed:', error);
            showNotification('Signup failed. Please check the console for more details.', 'error');
        }
    }
    );

    // Login form submission
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault(); // Prevent default form submission

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful:", data);
                showNotification("Logged in successfully!", 'success'); // "Logged in successfully!"

                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect based on role after a short delay to show the notification
                setTimeout(() => {
                    if (data.user.role === 'seller') {
                        window.location.href = 'farmer-dashboard.html';
                    } else if (data.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else if (data.user.role === 'buyer') {
                        window.location.href = 'buyer-dashboard.html';
                    }
                }, 1500); // 1.5-second delay

                loginForm.reset();
            } else {
                console.error("Login failed:", data);
                showNotification(`Error: ${data.message || 'Something went wrong.'}`, 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            showNotification('Login failed. Please check the console for more details.', 'error');
        }
    });

    // --- CONTACT FORM SUBMISSION (FORMSPREE) ---
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", handleContactFormSubmit);
    }
});

/**
 * @param {Event} event The form submission event.
 */
async function handleContactFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission
    const form = event.target;
    const data = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: data,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            showNotification("Thank you for your message! We'll get back to you soon.", 'success');
            form.reset();
            closePage('contactPage');
        } else {
            // Handle server-side errors from Formspree
            const responseData = await response.json();
            throw new Error(responseData.error || 'Failed to send message.');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

function updateNavbar() {
    // Desktop Nav Elements
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navSignupBtn = document.getElementById('navSignupBtn');
    const navUsername = document.getElementById('navUsername');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const mobileLoggedOut = document.getElementById('mobileLoggedOut');
    const mobileLoggedIn  = document.getElementById('mobileLoggedIn');
    const mobileUsername  = document.getElementById('mobileUsername');

     // if any navbar element is missing, skip update
    if (!navLoginBtn || !navSignupBtn || !navUsername || !navLogoutBtn) {
        console.warn("Navbar elements not found on this page — skipping updateNavbar()");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));


     if (user) {
        // ✅ Logged-in
        if (navLoginBtn)  navLoginBtn.classList.add('hidden');
        if (navSignupBtn) navSignupBtn.classList.add('hidden');
        if (navUsername) {
            navUsername.classList.remove('hidden');
            navUsername.textContent = user.name;
        }
        if (navLogoutBtn) navLogoutBtn.classList.remove('hidden');

        // Dashboard redirect link
        if (navUsername) {
            let dashboardUrl = 'index.html';
            if (user.role === 'seller') dashboardUrl = 'farmer-dashboard.html';
            else if (user.role === 'admin') dashboardUrl = 'admin-dashboard.html';
            else if (user.role === 'buyer') dashboardUrl = 'buyer-dashboard.html';
            navUsername.href = dashboardUrl;
        }

        if (mobileLoggedOut) mobileLoggedOut.classList.add('hidden');
        if (mobileLoggedIn)  {
            mobileLoggedIn.classList.remove('hidden');
            mobileLoggedIn.classList.add('flex');
        }
        if (mobileUsername)  mobileUsername.textContent = user.name;

    } else {
        if (navLoginBtn)  navLoginBtn.classList.remove('hidden');
        if (navSignupBtn) navSignupBtn.classList.remove('hidden');
        if (navUsername)  navUsername.classList.add('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.add('hidden');

        if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
        if (mobileLoggedIn)  mobileLoggedIn.classList.add('hidden');
    }
}

function showFarmersGuide() {
    document.getElementById("farmersGuide").classList.remove("hidden");
}

function showSignupPage(fromTerms = false) {
    document.getElementById("signupPage").classList.remove("hidden");
    document.getElementById("termsPage").classList.add("hidden");

    // If the user clicked "Continue" from the terms page
    if (fromTerms) {
        const signupTermsCheckbox = document.getElementById("signupTerms");
        const createAccountBtn = document.getElementById("createAccountBtn");

        // Automatically check the box on the signup form
        signupTermsCheckbox.checked = true;
        
        // Enable the create account button
        createAccountBtn.disabled = false;
    }
}

function showTermsPage(){
    document.getElementById("signupPage").classList.add("hidden");
    document.getElementById("termsPage").classList.remove("hidden");
}

function shopNow() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'buyer') {
        // Logged-in buyer → Go to dashboard
        window.location.href = 'buyer-dashboard.html';
    } else {
        // Not logged in → Go to public browse page
        window.location.href = 'browse.html';
    }
}


function showContactPage(){
    document.getElementById("contactPage").classList.remove("hidden");
}

function showContactPageFromMenu() {
    closePage('mobileMenu');
    showContactPage();
}

function loginCheck(){
    document.getElementById("loginCheck").classList.remove("hidden");  
}

function closePage(id) {
    document.getElementById(id).classList.add("hidden");
    document.body.classList.remove('overflow-hidden');

    if (id === 'loginPage') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        // Also close the loginCheck modal if it's open in the background
        const loginCheckModal = document.getElementById('loginCheck');
        if (loginCheckModal && !loginCheckModal.classList.contains('hidden')) {
            loginCheckModal.classList.add('hidden');
        }
    } else if (id === 'signupPage') {
        const signupForm = document.getElementById('signupForm');
        if (signupForm) signupForm.reset();
    } else if (id === 'contactPage') {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) contactForm.reset();
    }
}

function mobileMenu() {
    document.getElementById("mobileMenu").classList.remove("hidden");
    document.body.classList.add('overflow-hidden');
}

function logout() {
    console.log("Logout function called");
    
    // Clear user data from localStorage
    localStorage.removeItem('user');
    
    showNotification("You have been logged out.", "info");
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500); // 1.5-second delay
}


/**
 * Displays a temporary notification message on the screen.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('info', 'success', 'error').
 */
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.global-notification');
    existingNotifications.forEach(notification => notification.remove());
    const notification = document.createElement('div');
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-white'
    };
    console.log('showNotification called:', message, type); // Debugging line

     // Base classes for all notifications
    notification.className = `global-notification fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-500 ease-in-out opacity-0 -translate-y-12 ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
     // Animate in
    setTimeout(() => {
        notification.classList.remove('opacity-0', '-translate-y-12');
        notification.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        notification.classList.remove('opacity-100', 'translate-y-0');
        notification.classList.add('opacity-0', '-translate-y-12');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 3000);
}


// --- GLOBAL WISHLIST MANAGEMENT ---

/**
 * Retrieves the current wishlist from localStorage for the logged-in user.
 * @returns {string[]} An array of crop IDs.
 */
function getWishlist() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) return []; // No user, no wishlist.
    return JSON.parse(localStorage.getItem(`wishlist_${user.id}`)) || [];
}

/**
 * Saves the updated wishlist to localStorage for the logged-in user.
 * @param {string[]} wishlist - An array of crop IDs.
 */
function saveWishlist(wishlist) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) return; // Can't save if no user.
    localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(wishlist));
}

/**
 * Prompts for login if the user is not authenticated.
 * @param {string} cropId - The ID of the crop to toggle.
 * @param {HTMLElement} buttonElement - The button element that was clicked.
 */
function toggleWishlist(cropId, buttonElement) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        showNotification("Please login to manage your wishlist.", "info");
        showLoginPage('user'); // Directly show the user login page
        return;
    }

    let wishlist = getWishlist();
    const icon = buttonElement.querySelector('.wishlist-icon');
    // Use a more robust way to get the crop name, assuming it's in a data attribute
    const cropName = buttonElement.dataset.cropName || 'The crop';

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

    // If the wishlist section is currently visible on the buyer dashboard, refresh it.
    const wishlistSection = document.getElementById('wishlistSection');
    if (wishlistSection && !wishlistSection.classList.contains('hidden')) {
        loadWishlistItems(); // This function exists in buyer-dashboard.js
    }
}