// farmer-registration.js

const CLOUDINARY_CLOUD_NAME = 'dxzxlci6n'; 
const CLOUDINARY_UPLOAD_PRESET = 'ayeza24';

/**
 * Uploads a single file to Cloudinary and returns the secure URL.
 */
async function uploadFileToCloudinary(file) {
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    const imageUploadResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: cloudinaryFormData
    });

    if (!imageUploadResponse.ok) {
        const errorData = await imageUploadResponse.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed.');
    }

    const imageUploadData = await imageUploadResponse.json();
    return imageUploadData.secure_url;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- PRE-FILL DATA (Keep existing logic) ---
    const tempFarmerData = localStorage.getItem('tempFarmerReg');
    if (tempFarmerData) {
        try {
            const data = JSON.parse(tempFarmerData);
            if (data.name) document.getElementById('fullName').value = data.name;
            if (data.email) document.getElementById('email').value = data.email;
            if (data.phone) document.getElementById('phone').value = data.phone;
            if (data.password) document.getElementById('password').value = data.password;
            localStorage.removeItem('tempFarmerReg');
        } catch (error) { console.error(error); }
    }

    // Set max date
    const today = new Date().toISOString().split('T')[0];
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    if (dateOfBirthInput) dateOfBirthInput.setAttribute('max', today);

    // --- STATE VARIABLES ---
    let currentStep = 1;
    const form = document.getElementById('registrationForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const steps = [
        document.getElementById('step-1'), 
        document.getElementById('step-2'), 
        document.getElementById('step-3'), 
        document.getElementById('step-4')
    ];
    const progressFill = document.getElementById('progressFill');
    const currentStepSpan = document.querySelector('#currentStep span');
    const percentCompleteSpan = document.querySelector('#percentComplete span');

    // --- FILE INPUT UI HANDLERS ---
    const fileUploadWrappers = ['profilePhotoWrapper', 'aadharCardWrapper', 'landDocumentsWrapper', 'bankPassbookWrapper'];
    
    fileUploadWrappers.forEach(wrapperId => {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper) {
            const input = wrapper.querySelector('input[type="file"]');
            const p = wrapper.querySelector('p:not(.text-sm.text-gray-700)');
            
            // Trigger file input click when wrapper is clicked
            wrapper.addEventListener('click', (e) => { 
                if (e.target !== input) input.click(); 
            });

            // Update text when file is selected
            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    p.textContent = `File Selected: ${input.files[0].name}`;
                    p.classList.add('text-green-600', 'font-semibold');
                } else {
                    p.classList.remove('text-green-600', 'font-semibold');
                    const placeholderMap = {
                        'profilePhotoWrapper': 'Click to upload profile photo',
                        'aadharCardWrapper': 'Upload Aadhar (front & back)',
                        'landDocumentsWrapper': 'Upload land ownership documents',
                        'bankPassbookWrapper': 'Upload passbook front page'
                    };
                    p.textContent = placeholderMap[wrapperId] || 'Click to upload...';
                }
            });
        }
    });

    // --- NOTIFICATION HELPER ---
    function showNotification(message, type = 'error') {
        const existing = document.querySelector('.custom-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = message;
        
        // Styles for notification
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px',
            borderRadius: '8px', color: 'white', zIndex: '9999',
            backgroundColor: type === 'error' ? '#f44336' : (type === 'success' ? '#4CAF50' : '#2196F3'),
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        });

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    // --- VALIDATION LOGIC ---
    function validateStep(step) {
        const inputs = steps[step - 1].querySelectorAll('[required]');
        
        for (const input of inputs) {
            // 1. Check File Inputs
            if (step === 4 && input.type === 'file' && input.files.length === 0) {
                 showNotification(`Please upload the required document: ${input.name || 'File'}.`);
                return false;
            }

            // 2. Check Empty Fields (Text, Selects)
            if (!input.value.trim()) {
                showNotification(`Please fill out the ${input.previousElementSibling?.textContent.replace('*','') || 'required'} field.`);
                input.focus();
                return false;
            }

            // 3. Check Checkboxes (for organic cert)
            if (input.type === 'checkbox' && !input.checked) {
                 showNotification(`Please check: ${input.nextElementSibling?.textContent}`);
                 return false;
            }
            
            // 4. Specific Format Validation
            if (input.id === 'aadharNumber' && !/^\d{12}$/.test(input.value)) {
                showNotification('Aadhar Number must be exactly 12 digits.');
                return false;
            }
            if ((input.id === 'phone') && !/^\d{10}$/.test(input.value)) {
                showNotification('Phone number must be exactly 10 digits.');
                return false;
            }
            if (input.id === 'password' && input.value.length < 6) {
                showNotification('Password must be at least 6 characters long.');
                return false;
            }
        }
        return true;
    }

    // --- NAVIGATION & SUBMISSION HANDLER ---
    // IMPORTANT: using 'click' instead of 'submit' bypasses browser validation on hidden fields
    nextBtn.addEventListener('click', async () => {
        
        // 1. Validate current step before moving
        if (!validateStep(currentStep)) return;

        // 2. Handle Navigation (Step 1 -> 3)
        if (currentStep < 4) {
            steps[currentStep - 1].classList.add('hidden');
            currentStep++;
            steps[currentStep - 1].classList.remove('hidden');
            
            updateProgress();

            // Update Button Text if reaching final step
            if (currentStep === 4) {
                nextBtn.textContent = 'Submit Registration';
                // CRITICAL: Ensure type stays 'button' to prevent form submit event
                nextBtn.type = 'button'; 
            }
        } 
        // 3. Handle Final Submission (Step 4)
        else if (currentStep === 4) {
            await handleFinalSubmission();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            steps[currentStep - 1].classList.add('hidden');
            currentStep--;
            steps[currentStep - 1].classList.remove('hidden');
            updateProgress();
            
            nextBtn.textContent = 'Next Step';
            nextBtn.type = 'button';
        }
    });

    function updateProgress() {
        const percentage = (currentStep / 4) * 100;
        progressFill.style.width = `${percentage}%`;
        currentStepSpan.textContent = currentStep;
        percentCompleteSpan.textContent = percentage;
        prevBtn.disabled = currentStep === 1;
    }

    // --- FINAL SUBMISSION LOGIC ---
    async function handleFinalSubmission() {
        // Disable button to prevent double click
        nextBtn.disabled = true;
        nextBtn.textContent = 'Uploading...';
        showNotification('Uploading documents and creating account...', 'info');

        try {
            const formData = new FormData(form);
            const rawData = Object.fromEntries(formData.entries());

            // A. Upload Files to Cloudinary
            const fileInputs = [
                { id: 'profilePhoto', key: 'profilePhotoUrl' },
                { id: 'aadharCard', key: 'aadharCardUrl' },
                { id: 'landDocuments', key: 'landDocumentsUrl' },
                { id: 'bankPassbook', key: 'bankPassbookUrl' }
            ];

            const fileUrls = {};
            for (const { id, key } of fileInputs) {
                const fileInput = document.getElementById(id);
                if (fileInput.files.length > 0) {
                    // Upload file
                    fileUrls[key] = await uploadFileToCloudinary(fileInput.files[0]);
                } else if (fileInput.required) {
                    throw new Error(`Missing required file: ${id}`);
                }
            }

            // B. Get Crop Selections
            const getCheckedCropIds = (prefix) => 
                Array.from(document.querySelectorAll(`input[id^='${prefix}']:checked`))
                     .map(checkbox => checkbox.id.replace(prefix, ''));

            // C. Construct Payload (Matches Backend Schema)
            const payload = {
                name: rawData.fullName, // Mapped from 'fullName' input
                email: rawData.email,
                password: rawData.password,
                phone: rawData.phone,
                role: 'seller', // Hardcoded as this is farmer registration
                
                // Structured Address Object
                address: {
                    village: rawData.village,
                    district: rawData.district,
                    state: rawData.state,
                    pincode: rawData.pincode,
                    // You can add rawData.farmName as street if you want
                },

                // Farmer Details Object
                farmerDetails: {
                    farmName: rawData.farmName,
                    landSize: rawData.landSize,
                    landType: rawData.landType,
                    soilType: rawData.soilType,
                    farmingExperience: rawData.farmingExperience,
                    averageYield: rawData.averageYield,
                    organicCertified: document.getElementById('organicCertified').checked,
                    
                    // Spread the uploaded URLs
                    ...fileUrls,

                    // Crops Arrays
                    primaryCrops: getCheckedCropIds('primary'),
                    secondaryCrops: getCheckedCropIds('secondary')
                }
            };

            console.log("Submitting Payload:", payload); // Debugging

            // D. Send to Backend
            const response = await fetch('http://localhost:5000/api/users/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Server error during registration');
            }

            showNotification('Registration Successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);

        } catch (error) {
            console.error('Submission Error:', error);
            showNotification(error.message, 'error');
            
            // Re-enable button on error
            nextBtn.disabled = false;
            nextBtn.textContent = 'Submit Registration';
        }
    }
});

// Contact Modal Functions
function showContactPage() {
    const contactPage = document.getElementById('contactPage');
    if (contactPage) contactPage.classList.remove('hidden');
}

function closePage(pageId) {
    const page = document.getElementById(pageId);
    if (page) page.classList.add('hidden');
}