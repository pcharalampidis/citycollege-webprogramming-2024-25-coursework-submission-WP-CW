document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Handle filter form submission
    const filterForm = document.querySelector('#filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyFilters();
        });
    }

    // Handle price range inputs
    const minPriceInput = document.querySelector('[name="minPrice"]');
    const maxPriceInput = document.querySelector('[name="maxPrice"]');

    if (minPriceInput && maxPriceInput) {
        minPriceInput.addEventListener('change', validatePriceRange);
        maxPriceInput.addEventListener('change', validatePriceRange);
    }

    // Handle sort selection
    const sortSelect = document.querySelector('#sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFilters();
        });
    }

    // Handle additional filters button
    const filterDropdownBtn = document.querySelector('.filter-dropdown-btn');
    const additionalFilters = document.querySelector('.additional-filters');
    
    if (filterDropdownBtn && additionalFilters) {
        filterDropdownBtn.addEventListener('click', function() {
            additionalFilters.classList.toggle('show');
            this.classList.toggle('active');
        });

        // Close filters when clicking outside
        document.addEventListener('click', function(e) {
            if (!filterDropdownBtn.contains(e.target) && !additionalFilters.contains(e.target)) {
                additionalFilters.classList.remove('show');
                filterDropdownBtn.classList.remove('active');
            }
        });
    }

    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            try {
                const response = await fetch('/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ productId: productId, quantity: 1 })
                });
                
                if (response.ok) {
                    showNotification('Product added to cart successfully!', 'success');
                    updateCartCount();
                } else {
                    showNotification('Failed to add product to cart.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred.', 'error');
            }
        });
    });
});

function validatePriceRange() {
    const minPrice = parseFloat(document.querySelector('[name="minPrice"]').value) || 0;
    const maxPrice = parseFloat(document.querySelector('[name="maxPrice"]').value) || Infinity;
    
    if (minPrice > maxPrice) {
        showNotification('Minimum price cannot be greater than maximum price', 'warning');
        return false;
    }
    return true;
}

function applyFilters() {
    if (!validatePriceRange()) return;
    document.querySelector('#filterForm').submit();
}

function showNotification(message, type) {
    // You can implement this using your preferred notification library
    // For example, using Bootstrap's toast or alert components
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function updateCartCount() {
    fetch('/cart/count')
        .then(response => response.json())
        .then(data => {
            const cartCountElement = document.querySelector('#cartCount');
            if (cartCountElement) {
                cartCountElement.textContent = data.count;
            }
        })
        .catch(error => console.error('Error updating cart count:', error));
}
