// Configuration
const API_BASE_URL = window.location.origin;

// State management
let cart = [];
let products = [];
let squarePayments;
let card;
let config = {};
let cardInitAttempts = 0;
const MAX_CARD_INIT_ATTEMPTS = 3;

// Initialize the app
async function init() {
    // Check if Square SDK loaded
    if (typeof Square === 'undefined') {
        console.error('Square SDK failed to load');
        showError('Payment system is currently unavailable. Please try again later.');
        return;
    }
    
    await loadConfig();
    await loadProducts();
    setupEventListeners();
    updateCartCount();
    
    // Initialize Square Payment Form
    if (config.squareConfigured && typeof Square !== 'undefined') {
        try {
            if (!config.squareApplicationId || !config.squareLocationId) {
                console.error('Square configuration incomplete');
                showError('Payment system is not properly configured. Please contact support.');
                return;
            }
            squarePayments = Square.payments(config.squareApplicationId, config.squareLocationId);
            await initializeCard();
        } catch (error) {
            console.error('Error initializing Square:', error);
        }
    }
}

// Load configuration from server
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        config = await response.json();
    } catch (error) {
        console.error('Error loading configuration:', error);
        config = { squareConfigured: false };
    }
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products. Please refresh the page.');
    }
}

// Render products grid
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-price">$${(product.price / 100).toFixed(2)}</div>
                <button class="btn btn-primary" onclick="addToCart('${product.id}')">
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Cart management
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartCount();
    showNotification(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    renderCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            renderCart();
        }
    }
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const total = calculateTotal();
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="loading">Your cart is empty</p>';
        document.getElementById('checkoutBtn').disabled = true;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${(item.price / 100).toFixed(2)} each</p>
                </div>
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <div class="cart-item-price">
                    $${((item.price * item.quantity) / 100).toFixed(2)}
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                    Remove
                </button>
            </div>
        `).join('');
        document.getElementById('checkoutBtn').disabled = false;
    }
    
    document.getElementById('cartTotal').textContent = (total / 100).toFixed(2);
}

// View navigation
function showProducts() {
    hideAllSections();
    document.getElementById('productsSection').classList.remove('hidden');
}

function showCart() {
    hideAllSections();
    renderCart();
    document.getElementById('cartSection').classList.remove('hidden');
}

async function showCheckout() {
    hideAllSections();
    const total = calculateTotal();
    
    // Render checkout items
    const checkoutItems = document.getElementById('checkoutItems');
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} × ${item.quantity}</span>
            <span>$${((item.price * item.quantity) / 100).toFixed(2)}</span>
        </div>
    `).join('');
    
    document.getElementById('checkoutTotal').textContent = (total / 100).toFixed(2);
    document.getElementById('payAmount').textContent = (total / 100).toFixed(2);
    
    document.getElementById('checkoutSection').classList.remove('hidden');
    
    // Initialize card only if not already initialized
    if (squarePayments && !card) {
        if (cardInitAttempts < MAX_CARD_INIT_ATTEMPTS) {
            await initializeCard();
        } else {
            showError('Unable to initialize payment form. Please refresh the page and try again.');
        }
    } else if (card) {
        // Card already exists, just make sure it's attached
        try {
            await card.attach('#card-container');
        } catch (error) {
            // If attach fails, try to reinitialize once
            console.error('Error reattaching card:', error);
            if (cardInitAttempts < MAX_CARD_INIT_ATTEMPTS) {
                card = null;
                await initializeCard();
            } else {
                showError('Unable to initialize payment form. Please refresh the page and try again.');
            }
        }
    }
}

function showSuccess(orderId, receiptUrl) {
    hideAllSections();
    document.getElementById('successOrderId').textContent = orderId;
    
    if (receiptUrl) {
        // Validate URL is from Square - use strict hostname matching
        try {
            const url = new URL(receiptUrl);
            const hostname = url.hostname.toLowerCase();
            // Check if hostname is exactly squareup.com/squareupsandbox.com or a subdomain
            const isValidSquareDomain = 
                hostname === 'squareup.com' || 
                hostname === 'squareupsandbox.com' ||
                hostname.endsWith('.squareup.com') || 
                hostname.endsWith('.squareupsandbox.com');
            
            if (isValidSquareDomain && (url.protocol === 'https:' || url.protocol === 'http:')) {
                document.getElementById('receiptLink').innerHTML = 
                    `<a href="${receiptUrl}" target="_blank" rel="noopener noreferrer">View Receipt</a>`;
            } else {
                console.warn('Receipt URL from unexpected domain:', url.hostname);
            }
        } catch (error) {
            console.error('Invalid receipt URL:', error);
        }
    }
    
    document.getElementById('successSection').classList.remove('hidden');
    
    // Clear cart
    cart = [];
    updateCartCount();
}

function hideAllSections() {
    document.getElementById('productsSection').classList.add('hidden');
    document.getElementById('cartSection').classList.add('hidden');
    document.getElementById('checkoutSection').classList.add('hidden');
    document.getElementById('successSection').classList.add('hidden');
}

// Square Payment initialization
async function initializeCard() {
    try {
        cardInitAttempts++;
        card = await squarePayments.card();
        await card.attach('#card-container');
    } catch (error) {
        console.error('Error initializing card:', error);
        showError('Payment form initialization failed. Please check your Square configuration.');
    }
}

// Payment processing
async function processPayment(event) {
    event.preventDefault();
    
    const payButton = document.getElementById('payButton');
    const customerEmail = document.getElementById('customerEmail').value;
    
    if (!customerEmail) {
        showError('Please enter your email address');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
        showError('Please enter a valid email address');
        return;
    }
    
    payButton.disabled = true;
    payButton.textContent = 'Processing...';
    
    try {
        // Create order first
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
                customerEmail,
            }),
        });
        
        const order = await orderResponse.json();
        
        // Tokenize card
        const result = await card.tokenize();
        if (result.status === 'OK') {
            // Process payment
            const paymentResponse = await fetch(`${API_BASE_URL}/api/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: result.token,
                    amount: order.total,
                    orderId: order.orderId,
                }),
            });
            
            const paymentResult = await paymentResponse.json();
            
            if (paymentResult.success) {
                showSuccess(order.orderId, paymentResult.payment.receiptUrl);
            } else {
                throw new Error(paymentResult.error || 'Payment failed');
            }
        } else {
            throw new Error('Card tokenization failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showError(`Payment failed: ${error.message}`);
    } finally {
        payButton.disabled = false;
        payButton.innerHTML = `Pay $${(calculateTotal() / 100).toFixed(2)}`;
    }
}

// Event listeners
function setupEventListeners() {
    document.getElementById('cartIcon').addEventListener('click', showCart);
    document.getElementById('checkoutBtn').addEventListener('click', showCheckout);
    document.getElementById('continueShoppingBtn').addEventListener('click', showProducts);
    document.getElementById('backToCartBtn').addEventListener('click', showCart);
    document.getElementById('newOrderBtn').addEventListener('click', showProducts);
    document.getElementById('paymentForm').addEventListener('submit', processPayment);
}

// Utility functions
function showNotification(message) {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    // Find the currently visible section
    const sections = ['productsSection', 'cartSection', 'checkoutSection', 'successSection'];
    let visibleSection = null;
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section && !section.classList.contains('hidden')) {
            visibleSection = section;
        }
    });
    
    if (visibleSection) {
        // Remove existing error messages in the section
        const existing = visibleSection.querySelector('.error');
        if (existing) existing.remove();
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        visibleSection.insertBefore(errorDiv, visibleSection.firstChild);
    } else {
        // Fallback: show alert if no section is visible
        alert(message);
    }
}

// Add some basic animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
