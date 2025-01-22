document.addEventListener('DOMContentLoaded', async function() {
    // Redirect to login if not logged in
    try {
        const authResponse = await fetch('/auth/status');
        if (!authResponse.ok) throw new Error('Failed to check auth status');
        const authData = await authResponse.json();
        
        if (!authData.isLoggedIn) {
            localStorage.setItem('returnUrl', '/cart/checkout');
            window.location.href = '/auth/login';
            return;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showToast('Error', 'Failed to verify login status', true);
        return;
    }

    const checkoutItemsContainer = document.getElementById('checkout-items');
    const subtotalElement = document.getElementById('checkout-subtotal');
    const totalElement = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');
    let currentItems = [];

    // Listen for cart updates
    document.addEventListener('cartUpdated', function(event) {
        currentItems = event.detail.items;
        updateCheckoutDisplay(event.detail.total);
    });

    // Pre-fill user information if available
    async function loadUserInfo() {
        try {
            const response = await fetch('/auth/user-info');
            if (!response.ok) throw new Error('Failed to fetch user info');
            
            const userInfo = await response.json();
            
            if (userInfo) {
                document.getElementById('firstName').value = userInfo.First_Name || '';
                document.getElementById('lastName').value = userInfo.Last_Name || '';
                document.getElementById('address').value = userInfo.Address || '';
                
                // Try to parse city, state, and zip from address if available
                if (userInfo.Address) {
                    const addressParts = userInfo.Address.split(',');
                    if (addressParts.length >= 3) {
                        document.getElementById('city').value = addressParts[addressParts.length - 3].trim();
                        document.getElementById('state').value = addressParts[addressParts.length - 2].trim();
                        document.getElementById('zip').value = addressParts[addressParts.length - 1].trim();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            showToast('Error', 'Failed to load user information', true);
        }
    }

    function updateCheckoutDisplay(total = 0) {
        if (!checkoutItemsContainer) return;

        if (!currentItems || currentItems.length === 0) {
            checkoutItemsContainer.innerHTML = `
                <div class="alert alert-danger">
                    Your cart is empty. Please add items before checking out.
                </div>
            `;
            if (subtotalElement) subtotalElement.textContent = '$0.00';
            if (totalElement) totalElement.textContent = '$0.00';
            if (checkoutForm) checkoutForm.style.display = 'none';
            return;
        }

        checkoutItemsContainer.innerHTML = '';
        
        // Create and append each item
        currentItems.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item d-flex justify-content-between align-items-center mb-3 p-2 border-bottom';
            itemElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${item.image_url}" alt="${item.name}" class="checkout-item-image me-3" style="width: 50px; height: 50px; object-fit: cover;">
                    <div>
                        <div class="checkout-item-name fw-bold">${item.name}</div>
                        <div class="text-muted small">
                            <span>Qty: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}</span>
                            <br>
                            <span>Store: ${item.store_name}</span>
                        </div>
                    </div>
                </div>
                <div class="checkout-item-price fw-bold">$${itemTotal.toFixed(2)}</div>
            `;
            checkoutItemsContainer.appendChild(itemElement);
        });

        // Update totals
        if (subtotalElement) subtotalElement.textContent = `$${total.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
        if (checkoutForm) checkoutForm.style.display = 'block';
    }

    async function handleCheckoutSubmit(event) {
        event.preventDefault();
        console.log('Form submitted');

        if (!currentItems || currentItems.length === 0) {
            console.log('Cart is empty:', currentItems);
            showToast('Error', 'Your cart is empty', true);
            return;
        }

        // Basic validation for shipping info only
        const requiredShippingFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zip'];
        const emptyFields = requiredShippingFields.filter(field => !document.getElementById(field).value.trim());
        
        if (emptyFields.length > 0) {
            console.log('Empty fields:', emptyFields);
            showToast('Error', 'Please fill in all shipping information', true);
            return;
        }

        try {
            // Calculate totals
            const subtotal = currentItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            console.log('Current items:', currentItems);
            
            const formData = {
                shipping: {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    state: document.getElementById('state').value,
                    zip: document.getElementById('zip').value
                },
                payment: {
                    cardNumber: document.getElementById('cardNumber').value || '4111111111111111',
                    expiryMonth: document.getElementById('expiryMonth').value || '01',
                    expiryYear: document.getElementById('expiryYear').value || '2025',
                    cvv: document.getElementById('cvv').value || '123'
                },
                items: currentItems.map(item => ({
                    id: item.product_id,  
                    store_id: parseInt(item.store_id),  
                    quantity: parseInt(item.quantity),
                    price: parseFloat(item.price)
                })),
                totals: {
                    subtotal: parseFloat(subtotal),
                    total: parseFloat(subtotal)
                }
            };
            
            console.log('Sending order data:', formData);

            const response = await fetch('/cart/place-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Failed to place order');
            }
            
            // Show success message and clear cart data
            showToast('Success', 'Orders placed successfully!');
            localStorage.removeItem('cartItems');
            
            // Wait for toast to be visible
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Redirect to orders page
            window.location.href = '/orders';

        } catch (error) {
            console.error('Error placing order:', error);
            showToast('Error', error.message || 'Failed to place order', true);
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

    // Initialize
    await loadUserInfo();
    
    // Initial cart load
    const cartResponse = await fetch('/cart/items');
    if (cartResponse.ok) {
        const cartItems = await cartResponse.json();
        currentItems = cartItems;
        const total = cartItems.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * item.quantity);
        }, 0);
        updateCheckoutDisplay(total);
    } else {
        showToast('Error', 'Failed to load cart items', true);
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
});
