class ShoppingCart {
    constructor() {
        this.items = {};
        this.isLoggedIn = false;
        this.userId = null;
        this.cartDropdown = document.getElementById('shopping-cart');
        this.cartIcon = document.getElementById('cart-icon');
        this.cartVisible = false;
        
        // Initialize cart
        this.initialize();
    }

    async initialize() {
        try {
            // Check auth status
            const authResponse = await fetch('/auth/status');
            if (!authResponse.ok) throw new Error('Failed to get auth status');
            const authData = await authResponse.json();
            
            this.isLoggedIn = authData.isLoggedIn;
            this.userId = authData.userId;
            
            // Load cart items
            await this.refreshCart();
            
            // nitialise event listeners
            this.initializeEventListeners();
            
            // Set up cart refresh interval
            setInterval(() => this.refreshCart(), 1000); // Refresh every 0.5 seconds
        } catch (error) {
            console.error('Error initializing cart:', error);
            this.items = {};
            this.updateUI();
        }
    }

    calculateTotal() {
        return Object.values(this.items).reduce((total, item) => {
            return total + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);
    }

    async refreshCart() {
        try {
            // get the latest cart data from the server
            const response = await fetch('/cart/items');
            if (!response.ok) throw new Error('Failed to fetch cart items');
            
            const cartItems = await response.json();
            this.items = {};
            
            // Convert array of items to object format
            cartItems.forEach(item => {
                this.items[item.product_id] = {
                    name: item.name,
                    price: item.price,
                    quantity: parseInt(item.quantity),
                    image: item.image_url,
                    store_id: item.store_id,
                    store_name: item.store_name
                };
            });
            
            // Calculate total before updating UI
            const total = this.calculateTotal();
            
            // Update UI first
            this.updateUI();
            
            // Then dispatch event for cart-page.js
            const event = new CustomEvent('cartUpdated', { 
                detail: {
                    items: cartItems,
                    total: total
                }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('Error refreshing cart:', error);
        }
    }

    async addItem(productId, name, price, image = '', quantity = 1, storeId) {
        try {
            const response = await fetch('/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, storeId, quantity })
            });

            if (!response.ok) throw new Error('Failed to add item to cart');
            
            // Refresh cart to get updated state
            await this.refreshCart();
            
            // Show success toast
            this.showToast('Success', `Added ${quantity} x ${name} to cart`);
            return true;
        } catch (error) {
            console.error('Error adding item to cart:', error);
            this.showToast('Error', 'Failed to add item to cart', true);
            return false;
        }
    }

    async updateQuantity(productId, quantity) {
        try {
            const response = await fetch(`/cart/items/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            });

            if (!response.ok) throw new Error('Failed to update quantity');
            
            // Refresh cart to get updated state
            await this.refreshCart();
            return true;
        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showToast('Error', 'Failed to update quantity', true);
            return false;
        }
    }

    async removeItem(productId) {
        try {
            const response = await fetch(`/cart/items/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to remove item');
            
            // Refresh cart to get updated state
            await this.refreshCart();
            return true;
        } catch (error) {
            console.error('Error removing item:', error);
            this.showToast('Error', 'Failed to remove item', true);
            return false;
        }
    }

    showToast(title, message, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'toast show position-fixed top-0 end-0 m-3';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.zIndex = '1050';
        toast.innerHTML = `
            <div class="toast-header ${isError ? 'bg-danger' : 'bg-success'} text-white">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    updateUI() {
        if (!this.cartDropdown) return;

        const cartItemsList = this.cartDropdown.querySelector('#cart-items');
        const cartEmptyMessage = this.cartDropdown.querySelector('#cart-empty');
        const cartTotal = this.cartDropdown.querySelector('.cart-total');
        if (!cartItemsList) return;

        const total = this.calculateTotal();
        const cartCount = Object.values(this.items).reduce((sum, item) => sum + parseInt(item.quantity), 0);

        // Update cart count badge
        const cartBadge = document.querySelector('#cart-count');
        if (cartBadge) {
            cartBadge.textContent = cartCount;
            cartBadge.style.display = cartCount > 0 ? 'inline-block' : 'none';
        }

        if (Object.keys(this.items).length === 0) {
            cartItemsList.innerHTML = '';
            if (cartEmptyMessage) cartEmptyMessage.style.display = 'block';
            if (cartTotal) cartTotal.textContent = '$0.00';
            return;
        }

        if (cartEmptyMessage) cartEmptyMessage.style.display = 'none';

        let cartHtml = '';
        Object.entries(this.items).forEach(([id, item]) => {
            const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
            cartHtml += `
                <li class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image" style="width: 50px; height: 50px; object-fit: cover;">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">
                            <span>Qty: ${item.quantity}</span>
                            <span>× $${parseFloat(item.price).toFixed(2)}</span>
                        </div>
                        <div class="text-muted small">Total: $${itemTotal.toFixed(2)}</div>
                        <div class="text-muted small">${item.store_name}</div>
                    </div>
                    <button class="cart-item-remove" data-product-id="${id}">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `;
        });

        cartItemsList.innerHTML = cartHtml;
        if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    toggleCart(event) {
        if (event) {
            event.stopPropagation();
        }
        this.cartVisible = !this.cartVisible;
        if (this.cartDropdown) {
            this.cartDropdown.style.display = this.cartVisible ? 'block' : 'none';
        }
    }

    handleClickOutside(event) {
        if (this.cartVisible && 
            this.cartDropdown && 
            !this.cartDropdown.contains(event.target) && 
            !this.cartIcon.contains(event.target)) {
            this.toggleCart();
        }
    }

    initializeEventListeners() {
        // Cart toggle
        if (this.cartIcon) {
            this.cartIcon.addEventListener('click', (e) => this.toggleCart(e));
        }
        
        // Close cart when clicking outside
        document.addEventListener('click', (e) => this.handleClickOutside(e));
    }
}

// Initialize cart and make it globally accessible
window.cart = new ShoppingCart();

// Add the addToCart function to the window object
window.addToCart = async function(productId, name, price, image, quantity, storeId) {
    return await window.cart.addItem(productId, name, price, image, quantity, storeId);
};
