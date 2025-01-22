document.addEventListener('DOMContentLoaded', function() {
    // Initialize filters
    initializeFilters();
    
    // Setup search functionality
    setupSearch();
    
    // Setup product actions
    setupProductActions();
    
    // Initialize image previews
    initializeImagePreviews();
});

function initializeFilters() {
    const filters = document.querySelectorAll('.filter-group select');
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            applyFilters();
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applyFilters();
            }, 500);
        });
    }
}

function setupProductActions() {
    // Edit buttons
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            window.location.href = `/seller/products/edit/${productId}`;
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            confirmDelete(productId);
        });
    });

    // Add product button
    const addBtn = document.querySelector('.add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/seller/products/add';
        });
    }
}

function initializeImagePreviews() {
    const imageInputs = document.querySelectorAll('.product-image-input');
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const preview = document.querySelector(`#${this.dataset.previewId}`);
            if (preview && this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
}

function applyFilters() {
    const filters = {
        category: document.querySelector('#categoryFilter')?.value,
        status: document.querySelector('#statusFilter')?.value,
        price: document.querySelector('#priceFilter')?.value,
        search: document.querySelector('.search-box input')?.value
    };

    // Show loading state
    showLoading();

    // Fetch filtered products
    fetch('/api/seller/products/filter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
    })
    .then(response => response.json())
    .then(data => {
        updateProductGrid(data.products);
        hideLoading();
    })
    .catch(error => {
        console.error('Error applying filters:', error);
        showErrorAlert('Failed to apply filters');
        hideLoading();
    });
}

function updateProductGrid(products) {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">$${product.price}</div>
                <div class="product-stock">
                    <span class="stock-badge ${getStockClass(product.stock)}">
                        ${getStockLabel(product.stock)}
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-outline-primary edit-product-btn" data-product-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline-danger delete-product-btn" data-product-id="${product.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Reinitialize product actions
    setupProductActions();
}

function getStockClass(stock) {
    if (stock > 10) return 'in-stock';
    if (stock > 0) return 'low-stock';
    return 'out-stock';
}

function getStockLabel(stock) {
    if (stock > 10) return 'In Stock';
    if (stock > 0) return 'Low Stock';
    return 'Out of Stock';
}

function confirmDelete(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        // Submit the delete form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/seller/products/delete/${productId}`;
        document.body.appendChild(form);
        form.submit();
    }
}

function showLoading() {
    const grid = document.querySelector('.product-grid');
    if (grid) {
        grid.style.opacity = '0.5';
    }
}

function hideLoading() {
    const grid = document.querySelector('.product-grid');
    if (grid) {
        grid.style.opacity = '1';
    }
}

function showSuccessAlert(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-success alert-dismissible fade show';
    alertElement.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.products-container');
    if (container) {
        container.insertBefore(alertElement, container.firstChild);
    }
}

function showErrorAlert(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger alert-dismissible fade show';
    alertElement.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.products-container');
    if (container) {
        container.insertBefore(alertElement, container.firstChild);
    }
}
