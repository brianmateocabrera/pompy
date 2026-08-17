// Mock Products API Array Data
const PRODUCTS = [
    { id: 1, title: "Wireless Earbuds", price: 49.99, icon: "🎧" },
    { id: 2, title: "Smart Watch v2", price: 199.99, icon: "⌚" },
    { id: 3, title: "Leather Wallet", price: 29.99, icon: "👛" },
    { id: 4, title: "Running Shoes", price: 89.99, icon: "👟" }
];

// App Application State tracking
let cart = JSON.parse(localStorage.getItem('mobile_cart')) || [];

// DOM Element Targets
const productGrid = document.getElementById('productGrid');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartCount = document.getElementById('cartCount');
const cartTotalValue = document.getElementById('cartTotalValue');
const cartDrawer = document.getElementById('cartDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

// Initialize App Setup
function initApp() {
    renderProducts();
    updateCartUI();
    setupEventListeners();
}

// Display Catalog Grid Data 
function renderProducts() {
    productGrid.innerHTML = PRODUCTS.map(product => `
        <div class="product-card">
            <div class="product-img">${product.icon}</div>
            <div class="product-title">${product.title}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
        </div>
    `).join('');
}

// Synchronize calculations, UI updates, and LocalStorage state
function updateCartUI() {
    // 1. Calculate Summary Totals
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Map Counter Badges
    cartCount.textContent = totalItems;
    cartTotalValue.textContent = `$${totalPrice.toFixed(2)}`;

    // 3. Render Items to Panel
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center;color:#64748b;margin-top:20px;">Your cart is empty.</p>';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div style="font-size:1.5rem">${item.icon}</div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div style="font-size:0.85rem;color:#64748b">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn dec-btn" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn inc-btn" data-id="${item.id}">+</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 4. Save state 
    localStorage.setItem('mobile_cart', JSON.stringify(cart));
}

// Cart Event Actions Rules
function handleAddToCart(id) {
    const product = PRODUCTS.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
}

function handleQuantityChange(id, action) {
    const targetItem = cart.find(item => item.id === id);
    if (!targetItem) return;

    if (action === 'increment') {
        targetItem.quantity += 1;
    } else if (action === 'decrement') {
        targetItem.quantity -= 1;
        if (targetItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
    }
    updateCartUI();
}

// Global Event Routing Configurations
function setupEventListeners() {
    // Open/Close Drawer Handlers
    document.getElementById('cartToggleBtn').addEventListener('click', () => {
        cartDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
    });

    const closeCart = () => {
        cartDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    };

    document.getElementById('closeDrawerBtn').addEventListener('click', closeCart);
    drawerOverlay.addEventListener('click', closeCart);

    // Grid Click event intercept logic (Event Delegation)
    productGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.id);
            handleAddToCart(productId);
        }
    });

    // Cart Panel item control changes
    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('qty-btn')) {
            const productId = parseInt(e.target.dataset.id);
            const action = e.target.classList.contains('inc-btn') ? 'increment' : 'decrement';
            handleQuantityChange(productId, action);
        }
    });

    // Dummy checkout verification handler
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        if(cart.length === 0) return alert('Your cart is empty');
        alert('Thank you for your purchase order!');
        cart = [];
        updateCartUI();
        closeCart();
    });
}

// Start Runtime execution
document.addEventListener('DOMContentLoaded', initApp);
