// Initialize sorting functionality
function initializeSorting() {
    const sortSelect = document.getElementById('storeSortSelect');
    const storesList = document.getElementById('storesList');

    if (!sortSelect || !storesList) {
        console.error('Required elements not found:', {
            sortSelect: !!sortSelect,
            storesList: !!storesList
        });
        return;
    }

    // Function to sort stores
    function sortStores() {
        const sortBy = sortSelect.value;
        console.log('Sorting by:', sortBy);

        try {
            const stores = Array.from(storesList.children);
            
            // Sort stores
            stores.sort((a, b) => {
                try {
                    const aPrice = parseFloat(a.dataset.price) || Infinity;
                    const bPrice = parseFloat(b.dataset.price) || Infinity;
                    const aStock = parseInt(a.dataset.stock) || 0;
                    const bStock = parseInt(b.dataset.stock) || 0;
                    const aRating = parseFloat(a.dataset.rating) || 0;
                    const bRating = parseFloat(b.dataset.rating) || 0;
                    const aName = (a.dataset.name || '').trim();
                    const bName = (b.dataset.name || '').trim();

                    switch(sortBy) {
                        case 'price_asc':
                            return aPrice === bPrice ? aName.localeCompare(bName) : aPrice - bPrice;
                        case 'price_desc':
                            return bPrice === aPrice ? aName.localeCompare(bName) : bPrice - aPrice;
                        case 'name_asc':
                            return aName.localeCompare(bName);
                        case 'name_desc':
                            return bName.localeCompare(aName);
                        case 'stock_desc':
                            return bStock === aStock ? aName.localeCompare(bName) : bStock - aStock;
                        case 'rating_desc':
                            return bRating === aRating ? aName.localeCompare(bName) : bRating - aRating;
                        default:
                            return 0;
                    }
                } catch (err) {
                    console.error('Error comparing stores:', err);
                    return 0;
                }
            });

            // Clear and update the stores list
            while (storesList.firstChild) {
                storesList.removeChild(storesList.firstChild);
            }
            stores.forEach(store => storesList.appendChild(store));
        } catch (err) {
            console.error('Error in sortStores:', err);
        }
    }

    // Add change event listener
    sortSelect.addEventListener('change', sortStores);

    // Initial sort
    sortStores();
}

// Initialize everything when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSorting);
} else {
    initializeSorting();
}

// Initialize quantity input
function initializeQuantityInput() {
    const quantityInput = document.querySelector('#quantity');
    if (quantityInput) {
        quantityInput.addEventListener('change', validateQuantity);
    }
}

// Initialize add to cart button
function initializeAddToCartButton() {
    const addToCartBtn = document.querySelector('#addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }
}

// Initialize store availability tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Initialize image zoom (if using a zoom library)
function initializeImageZoom() {
    const productImage = document.querySelector('.product-image');
    if (productImage) {
        productImage.addEventListener('click', function() {
            // You can implement image zoom functionality here
            // For example, using a library like medium-zoom
        });
    }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded - Initializing product details page');
        initializeSorting();
        initializeQuantityInput();
        initializeAddToCartButton();
        initializeTooltips();
        initializeImageZoom();

        console.log('Product details script loaded');

        // Handle store selection change
        document.querySelector('#storeSelect')?.addEventListener('change', function(e) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const price = selectedOption.dataset.price;
            const stock = selectedOption.dataset.stock;
            
            // Update price display
            const priceElement = document.querySelector('#productPrice');
            if (priceElement && price) {
                priceElement.textContent = `$${parseFloat(price).toFixed(2)}`;
            }

            // Update stock status
            const stockElement = document.querySelector('#stockStatus');
            if (stockElement && stock) {
                const stockNum = parseInt(stock);
                let statusClass = 'in-stock';
                let statusText = 'In Stock';

                if (stockNum <= 0) {
                    statusClass = 'out-of-stock';
                    statusText = 'Out of Stock';
                } else if (stockNum <= 5) {
                    statusClass = 'low-stock';
                    statusText = 'Low Stock';
                }

                stockElement.className = `store-availability ${statusClass}`;
                stockElement.textContent = statusText;
            }
        });
    });
} else {
    initializeSorting();
    initializeQuantityInput();
    initializeAddToCartButton();
    initializeTooltips();
    initializeImageZoom();
}

function validateQuantity(event) {
    const input = event.target;
    const value = parseInt(input.value);
    const max = parseInt(input.getAttribute('max'));
    const min = parseInt(input.getAttribute('min'));

    if (value > max) {
        input.value = max;
        showNotification('Maximum quantity available is ' + max, 'warning');
    } else if (value < min) {
        input.value = min;
        showNotification('Minimum quantity is ' + min, 'warning');
    }
}

async function handleAddToCart(event) {
    event.preventDefault();
    const productId = this.dataset.productId;
    const quantity = parseInt(document.querySelector('#quantity').value);
    const storeSelect = document.querySelector('#storeSelect');
    const storeId = storeSelect?.value;
    
    // Get product details
    const productName = document.querySelector('.product-title').textContent;
    const productImage = document.querySelector('.product-image img')?.src || '';
    const price = storeSelect ? 
        storeSelect.options[storeSelect.selectedIndex].dataset.price : 
        document.querySelector('.product-price').dataset.price;

    try {
        // Use the global cart object to add the item
        const success = await window.cart.addItem(
            productId,
            productName,
            price,
            productImage,
            quantity,
            storeId
        );

        if (success) {
            showNotification('Product added to cart successfully!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while adding to cart.', 'error');
    }
}

function showNotification(message, type) {
    try {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
        toast.style.zIndex = '1060';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close ms-3" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

function updateCartCount(count) {
    const cartCountElement = document.querySelector('#cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

// Cart functionality
async function addToCart(productId, productName, price, imageUrl, quantity, storeId) {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId,
                productName,
                price,
                imageUrl,
                quantity,
                storeId
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('Added to cart successfully!', 'success');
            if (typeof updateCartCount === 'function') {
                updateCartCount(data.cartCount);
            }
            return true;
        } else {
            showNotification(data.message || 'Failed to add to cart', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
        return false;
    }
}
