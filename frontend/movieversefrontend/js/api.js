/* ================================================
   MovieVerse - API & Auth Utilities
   js/api.js
   ================================================ */

const CONFIG = {
  GATEWAY_URL: 'https://api-gateway-ql0f.onrender.com',
  AUTH_SERVICE:    '/api/auth',
  MOVIE_SERVICE:   '/api/movies',
  THEATER_SERVICE: '/api/theaters',
  SHOW_SERVICE:    '/api/shows',
  BOOKING_SERVICE: '/api/bookings',
  PAYMENT_SERVICE: '/api/payments',
};

/* -------- Token Helpers -------- */
const Auth = {
  getToken: () => localStorage.getItem('mv_token'),
  setToken: (token) => localStorage.setItem('mv_token', token),
  removeToken: () => localStorage.removeItem('mv_token'),

  getUser: () => {
    const u = localStorage.getItem('mv_user');
    return u ? JSON.parse(u) : null;
  },
  setUser: (user) => localStorage.setItem('mv_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('mv_user'),

  isLoggedIn: () => !!localStorage.getItem('mv_token'),

  isAdmin: () => {
    const user = Auth.getUser();
    return user && user.role === 'ADMIN';
  },

  logout: () => {
    Auth.removeToken();
    Auth.removeUser();
    window.location.href = '/pages/login.html';
  },

  requireAuth: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  },

  requireAdmin: () => {
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

/* -------- HTTP Client -------- */
const API = {
  _buildHeaders(auth = true, contentType = true) {
    const headers = {};
    if (contentType) headers['Content-Type'] = 'application/json';
    if (auth && Auth.isLoggedIn()) {
      headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    }
    return headers;
  },

  async _handleResponse(res) {
    const text = await res.text();
    let body = text;
    let isJson = false;
    if (text && text.trim()) {
      try {
        body = JSON.parse(text);
        isJson = true;
      } catch (e) {
        // Not JSON
      }
    } else {
      body = {};
      isJson = true;
    }

    if (!res.ok) {
      const msg = (isJson && body.message) ? body.message :
                  (isJson && body.error) ? body.error :
                  `HTTP ${res.status}`;
      throw new APIError(msg, res.status, body);
    }
    return body;
  },

  async get(path, auth = true) {
    const res = await fetch(CONFIG.GATEWAY_URL + path, {
      method: 'GET',
      headers: this._buildHeaders(auth, false),
    });
    return this._handleResponse(res);
  },

  async post(path, data, auth = true) {
    const res = await fetch(CONFIG.GATEWAY_URL + path, {
      method: 'POST',
      headers: this._buildHeaders(auth),
      body: JSON.stringify(data),
    });
    return this._handleResponse(res);
  },

  async put(path, data, auth = true) {
    const res = await fetch(CONFIG.GATEWAY_URL + path, {
      method: 'PUT',
      headers: this._buildHeaders(auth),
      body: JSON.stringify(data),
    });
    return this._handleResponse(res);
  },

  async delete(path, auth = true) {
    const res = await fetch(CONFIG.GATEWAY_URL + path, {
      method: 'DELETE',
      headers: this._buildHeaders(auth, false),
    });
    return this._handleResponse(res);
  },

  /* ---- Auth APIs ---- */
  auth: {
    register: (data) => API.post(`${CONFIG.AUTH_SERVICE}/register`, data, false),
    login: (data) => API.post(`${CONFIG.AUTH_SERVICE}/login`, data, false),
    googleLogin: (data) => API.post(`${CONFIG.AUTH_SERVICE}/google`, data, false),
    me: () => API.get(`${CONFIG.AUTH_SERVICE}/me`),
  },

  /* ---- Movie APIs ---- */
  movies: {
    getAll: (params = '') => API.get(`${CONFIG.MOVIE_SERVICE}?${params}`, false),
    getById: (id) => API.get(`${CONFIG.MOVIE_SERVICE}/${id}`, false),
    search: (q) => API.get(`${CONFIG.MOVIE_SERVICE}/search?query=${encodeURIComponent(q)}`, false),
    create: (data) => API.post(CONFIG.MOVIE_SERVICE, data),
    update: (id, data) => API.put(`${CONFIG.MOVIE_SERVICE}/${id}`, data),
    delete: (id) => API.delete(`${CONFIG.MOVIE_SERVICE}/${id}`),
  },

  /* ---- Theater APIs ---- */
  theaters: {
    getAll: () => API.get(CONFIG.THEATER_SERVICE, false),
    getById: (id) => API.get(`${CONFIG.THEATER_SERVICE}/${id}`, false),
    getByCity: (city) => API.get(`${CONFIG.THEATER_SERVICE}?city=${city}`, false),
    create: (data) => API.post(CONFIG.THEATER_SERVICE, data),
    update: (id, data) => API.put(`${CONFIG.THEATER_SERVICE}/${id}`, data),
    delete: (id) => API.delete(`${CONFIG.THEATER_SERVICE}/${id}`),
  },

  /* ---- Show APIs ---- */
  shows: {
    getAll: (params = '') => API.get(`${CONFIG.SHOW_SERVICE}?${params}`, false),
    getById: (id) => API.get(`${CONFIG.SHOW_SERVICE}/${id}`, false),
    getByMovie: (movieId) => API.get(`${CONFIG.SHOW_SERVICE}?movieId=${movieId}`, false),
    getSeats: (showId) => API.get(`${CONFIG.SHOW_SERVICE}/${showId}/seats`, false),
    create: (data) => API.post(CONFIG.SHOW_SERVICE, data),
    update: (id, data) => API.put(`${CONFIG.SHOW_SERVICE}/${id}`, data),
    delete: (id) => API.delete(`${CONFIG.SHOW_SERVICE}/${id}`),
  },

  /* ---- Booking APIs ---- */
  bookings: {
    reserve: (data) => API.post(`${CONFIG.BOOKING_SERVICE}/reserve`, data),
    confirm: (id, data) => API.post(`${CONFIG.BOOKING_SERVICE}/${id}/confirm`, data),
    cancel: (id) => API.put(`${CONFIG.BOOKING_SERVICE}/${id}/cancel`, {}),
    getUserBookings: (userId) => API.get(`${CONFIG.BOOKING_SERVICE}/user/${userId}`),
    getById: (id) => API.get(`${CONFIG.BOOKING_SERVICE}/${id}`),
    getAll: () => API.get(`${CONFIG.BOOKING_SERVICE}/admin/all`),
    updateStatus: (id, status) => API.put(`${CONFIG.BOOKING_SERVICE}/${id}/status`, { status }),
    delete: (id) => API.delete(`${CONFIG.BOOKING_SERVICE}/${id}`),
  },

  /* ---- Payment APIs ---- */
  payments: {
    getConfig: () => API.get(`${CONFIG.PAYMENT_SERVICE}/config`),
    createOrder: (data) => API.post(`${CONFIG.PAYMENT_SERVICE}/create-order`, data),
    verifyPayment: (data) => API.post(`${CONFIG.PAYMENT_SERVICE}/verify`, data),
    initiate: (data) => API.post(`${CONFIG.PAYMENT_SERVICE}/initiate`, data),
    confirm: (data) => API.post(`${CONFIG.PAYMENT_SERVICE}/confirm`, data),
    status: (bookingId) => API.get(`${CONFIG.PAYMENT_SERVICE}/status/${bookingId}`),
    getAll: () => API.get(CONFIG.PAYMENT_SERVICE),
    delete: (id) => API.delete(`${CONFIG.PAYMENT_SERVICE}/${id}`),
  },

  /* ---- User Admin APIs ---- */
  users: {
    getAll: () => API.get(`${CONFIG.AUTH_SERVICE}/users`),
    update: (id, data) => API.put(`${CONFIG.AUTH_SERVICE}/users/${id}`, data),
    delete: (id) => API.delete(`${CONFIG.AUTH_SERVICE}/users/${id}`),
  },
};

class APIError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/* -------- Toast Notifications -------- */
const Toast = {
  _container: null,

  init() {
    if (!document.getElementById('toast-container')) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      document.body.appendChild(this._container);
    } else {
      this._container = document.getElementById('toast-container');
    }
  },

  show(message, type = 'info', duration = 4000) {
    if (!this._container) this.init();
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:16px; flex-shrink:0;">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;
    this._container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 280);
    }, duration);
  },

  success: (msg) => Toast.show(msg, 'success'),
  error: (msg) => Toast.show(msg, 'error'),
  info: (msg) => Toast.show(msg, 'info'),
  warning: (msg) => Toast.show(msg, 'warning'),
};

/* -------- Navbar Component -------- */
function renderNavbar(activePage = '') {
  const user = Auth.getUser();
  const isAdmin = Auth.isAdmin();
  const isLoggedIn = Auth.isLoggedIn();
  const root = window.location.pathname.includes('/pages/') ? '../' : './';

  const navbarHTML = `
    <nav class="navbar">
      <a href="${root}index.html" class="nav-logo">
        <div class="nav-logo-icon">🎬</div>
        <span class="nav-logo-text">MOVIE<span>VERSE</span></span>
      </a>
      <ul class="nav-links">
        <li><a href="${root}index.html" class="${activePage==='home'?'active':''}">Home</a></li>
        <li><a href="${root}pages/movies.html" class="${activePage==='movies'?'active':''}">Movies</a></li>
        ${isLoggedIn ? `<li><a href="${root}pages/bookings.html" class="${activePage==='bookings'?'active':''}">My Bookings</a></li>` : ''}
        ${isAdmin ? `<li><a href="${root}pages/admin.html" class="${activePage==='admin'?'active':''}">Admin</a></li>` : ''}
      </ul>
      <div class="nav-actions">
        ${isLoggedIn ? `
          <div class="nav-user" id="navUserMenu">
            <div class="nav-avatar">${user?.fullName?.[0]?.toUpperCase() || 'U'}</div>
            <span style="color:var(--text-primary);font-size:14px;font-weight:500">${user?.fullName || 'User'}</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Logout</button>
        ` : `
          <a href="${root}pages/login.html" class="btn btn-ghost btn-sm">Login</a>
          <a href="${root}pages/register.html" class="btn btn-primary btn-sm">Register</a>
        `}
      </div>
    </nav>
  `;
  const placeholder = document.getElementById('navbar-placeholder');
  if (placeholder) placeholder.innerHTML = navbarHTML;
  else document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

/* -------- Footer Component -------- */
function renderFooter() {
  const root = window.location.pathname.includes('/pages/') ? '../' : './';
  const footerHTML = `
    <footer>
      <div class="footer-content">
        <div class="footer-brand">
          <a href="${root}index.html" class="nav-logo" style="text-decoration:none">
            <div class="nav-logo-icon">🎬</div>
            <span class="nav-logo-text">MOVIE<span>VERSE</span></span>
          </a>
          <p>Your ultimate destination for the best cinema experience. Book tickets fast, choose your seats, enjoy the show.</p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <a href="${root}pages/movies.html">All Movies</a>
          <a href="${root}index.html#now-showing">Now Showing</a>
          <a href="${root}index.html#coming-soon">Coming Soon</a>
        </div>
        <div class="footer-col">
          <h4>Account</h4>
          <a href="${root}pages/login.html">Login</a>
          <a href="${root}pages/register.html">Register</a>
          <a href="${root}pages/bookings.html">My Bookings</a>
        </div>
        <div class="footer-col">
          <h4>Info</h4>
          <a href="#">About Us</a>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 MovieVerse. All rights reserved.</span>
        <span>Built with ❤️ for cinema lovers</span>
      </div>
    </footer>
  `;
  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder) placeholder.innerHTML = footerHTML;
  else document.body.insertAdjacentHTML('beforeend', footerHTML);
}

/* -------- Utility Functions -------- */
const Utils = {
  formatDate: (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  },

  formatTime: (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  },

  formatDateTime: (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  },

  formatCurrency: (amount) => {
    if (amount == null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(amount);
  },

  debounce: (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  getStatusBadge: (status) => {
    const map = {
      CONFIRMED: 'badge-green',
      PENDING: 'badge-gold',
      CANCELLED: 'badge-red',
      COMPLETED: 'badge-blue',
      SUCCESS: 'badge-green',
      FAILED: 'badge-red',
    };
    return map[status] || 'badge-gray';
  },

  truncate: (str, len = 120) => str && str.length > len ? str.slice(0, len) + '...' : str,

  getQueryParam: (name) => new URLSearchParams(window.location.search).get(name),

  setQueryParam: (name, value) => {
    const url = new URL(window.location);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
  },

  /* High-quality movie poster URL helper */
  getPosterUrl: (movie) => {
    if (movie?.posterUrl && movie.posterUrl.startsWith('http') && !movie.posterUrl.includes('example.com')) {
      return movie.posterUrl;
    }
    const posterStock = [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop'
    ];
    const pick = posterStock[Math.abs(hashStr(movie?.title || 'M')) % posterStock.length];
    return pick;
  },
};

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

/* Init Toast on every page */
document.addEventListener('DOMContentLoaded', () => Toast.init());
