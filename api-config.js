// // A central place for API configuration

// const API_BASE_URL = 'http://localhost:5000/api';

// /**
//  * A wrapper around the native fetch function to automatically prepend the base URL.
//  * @param {string} endpoint - The API endpoint to call (e.g., '/users/login').
//  * @param {object} options - The options object for the fetch call (method, headers, body, etc.).
//  * @returns {Promise<Response>} The fetch promise.
//  */
// function apiFetch(endpoint, options) {
//     // You could add authorization headers here automatically in the future
//     // const token = localStorage.getItem('token');
//     // if (token) {
//     //     options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
//     // }
//     return fetch(`${API_BASE_URL}${endpoint}`, options);
// }