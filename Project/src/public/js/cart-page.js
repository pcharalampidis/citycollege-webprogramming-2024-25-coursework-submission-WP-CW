document.addEventListener('DOMContentLoaded', function() {
    const cartContainer = document.getElementById('cart-items-container');
    const subtotalElement = document.getElementById('cart-subtotal');
    const checkoutButton = document.getElementById('proceed-to-checkout');
    let items = [];

    // Listen for cart updates from cart.js
    document.addEventListener('cartUpdated', function(event) {
        items = event.detail.items;
        updateCartDisplay(event.detail.total);
    });

    async function updateCartDisplay(cartTotal = 0) {
        if (!cartContainer) return;

        if (items.length === 0) {
            cartContainer.innerHTML = `
                <div class="alert alert-info mb-0">
                    Your cart is empty. <a href="/products" class="alert-link">Continue shopping</a>
                </div>
            `;
            if (subtotalElement) subtotalElement.textContent = '$0.00';
            if (checkoutButton) checkoutButton.disabled = true;
            return;
        }

        cartContainer.innerHTML = '';

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'mb-4 border-bottom pb-3';
            itemElement.innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${item.image_url || '/images/placeholder.jpg'}" 
                             alt="${item.name}" 
                             class="img-fluid rounded">
                    </div>
                    <div class="col-md-4">
                        <h5 class="mb-1">${item.name}</h5>
                        <p class="text-muted mb-0">Store: ${item.store_name}</p>
                        <p class="text-muted mb-0">Unit Price: $${parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <button class="btn btn-sm btn-outline-secondary decrease-quantity" 
                                    data-product-id="${item.product_id}" 
                                    ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="mx-3 quantity">${item.quantity}</span>
                            <button class="btn btn-sm btn-outline-secondary increase-quantity" 
                                    data-product-id="${item.product_id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-2 text-end">
                        <span class="h5">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                    <div class="col-md-1 text-end">
                        <button class="btn btn-sm btn-danger remove-item" data-product-id="${item.product_id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners
            const minusBtn = itemElement.querySelector('.decrease-quantity');
            const plusBtn = itemElement.querySelector('.increase-quantity');
            const removeBtn = itemElement.querySelector('.remove-item');

            minusBtn.addEventListener('click', () => updateQuantity(item.product_id, item.quantity - 1));
            plusBtn.addEventListener('click', () => updateQuantity(item.product_id, item.quantity + 1));
            removeBtn.addEventListener('click', () => removeItem(item.product_id));

            cartContainer.appendChild(itemElement);
        });

        // Update subtotal and checkout button
        if (subtotalElement) subtotalElement.textContent = `$${cartTotal.toFixed(2)}`;
        if (checkoutButton) checkoutButton.disabled = items.length === 0;
    }

    async function updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            if (confirm('Do you want to remove this item from your cart?')) {
                await removeItem(productId);
            }
            return;
        }

        try {
            const response = await fetch(`/cart/items/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: newQuantity })
            });

            if (!response.ok) throw new Error('Failed to update quantity');

            // Cart.js will handle the refresh and update via the cartUpdated event
            showToast('Success', 'Quantity updated');

        } catch (error) {
            console.error('Error updating quantity:', error);
            showToast('Error', 'Failed to update quantity', true);
        }
    }

    async function removeItem(productId) {
        if (!confirm('Are you sure you want to remove this item?')) return;

        try {
            const response = await fetch(`/cart/items/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to remove item');

            // Cart.js will handle the refresh and update via the cartUpdated event
            showToast('Success', 'Item removed from cart');
        } catch (error) {
            console.error('Error removing item:', error);
            showToast('Error', 'Failed to remove item', true);
        }
    }

    function showToast(title, message, isError = false) {
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

    // Initial cart load
    fetch('/cart/items')
        .then(response => response.json())
        .then(cartItems => {
            items = cartItems;
            const total = cartItems.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * parseInt(item.quantity));
            }, 0);
            updateCartDisplay(total);
        })
        .catch(error => {
            console.error('Error loading cart:', error);
            showToast('Error', 'Failed to load cart items', true);
        });

    // Handle checkout button
    if (checkoutButton) {
        checkoutButton.addEventListener('click', function() {
            window.location.href = '/cart/checkout';
        });
    }
});
