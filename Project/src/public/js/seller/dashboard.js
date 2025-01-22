document.addEventListener('DOMContentLoaded', function() {
    // Initialize date filters
    initializeDateFilters();
    
    // Setup quick action handlers
    setupQuickActions();

    // Initialize product filters
    initializeProductFilters();

    // Initialize product type change handler
    initializeProductTypeHandler();
});

function initializeDateFilters() {
    const dateFilters = document.querySelectorAll('.date-filter');
    dateFilters.forEach(filter => {
        filter.addEventListener('change', function() {
            updateDashboardData(this.value);
        });
    });
}

// make  quick action cards clickable
function setupQuickActions() {
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'add-product':
            window.location.href = '/seller/products/add';
            break;
        case 'view-orders':
            window.location.href = '/seller/orders';
            break;
        case 'settings':
            window.location.href = '/seller/settings';
            break;
        case 'manage-products':
            window.location.href = '/seller/products/manage';
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// setup filters to help find products quickly
function initializeProductFilters() {
    const productFilter = document.getElementById('productFilter');
    if (productFilter) {
        productFilter.addEventListener('change', function() {
            updateProductList(this.value);
        });
    }

    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            window.location.href = `/seller/products/edit?id=${productId}`;
        });
    });
}

// update the product list when filters change
function updateProductList(filterValue) {
    fetch(`/api/seller/products?filter=${filterValue}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('productsTableBody');
            if (!tbody) return;

            tbody.innerHTML = data.products.map(product => `
                <tr>
                    <td>
                        <img src="${product.Image_URL}" alt="${product.Name}" class="product-thumbnail" width="50" height="50">
                    </td>
                    <td>${product.Name}</td>
                    <td>${product.Category_Name}</td>
                    <td>$${product.Price}</td>
                    <td>${product.Stock}</td>
                    <td>
                        <span class="badge ${product.Stock > 10 ? 'bg-success' : (product.Stock > 0 ? 'bg-warning' : 'bg-danger')}">
                            ${product.Stock > 10 ? 'In Stock' : (product.Stock > 0 ? 'Low Stock' : 'Out of Stock')}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <a href="/seller/products/edit/${product.Product_ID}" class="btn btn-sm btn-outline-primary edit-product-btn" data-product-id="${product.Product_ID}">Edit</a>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.Product_ID})">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error updating product list:', error);
            showErrorAlert('Failed to update product list');
        });
}

// carefuly remove a product from the store
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    fetch(`/api/seller/products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin' // Add this to ensure cookies/session are sent
    })
    .then(async response => {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete product');
        }
        return data;
    })
    .then(data => {
        // Refresh the product list
        updateProductList(document.getElementById('productFilter')?.value || '');
        showSuccessAlert('Product deleted successfully');
    })
    .catch(error => {
        console.error('Error deleting product:', error);
        showErrorAlert(error.message || 'Failed to delete product');
    });
}

// handles what happens when someone changes the product type
function initializeProductTypeHandler() {
    const typeSelect = document.getElementById('typeId');
    const categorySelect = document.getElementById('categoryId');
    
    if (typeSelect && categorySelect) {
        // Store all category options initially
        const allCategories = Array.from(categorySelect.options);
        
        typeSelect.addEventListener('change', function() {
            const selectedTypeId = this.value;
            
            // Reset categories
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            
            if (selectedTypeId) {
                // Filter and add relevant categories
                allCategories.forEach(option => {
                    if (option.dataset.type === selectedTypeId || !option.dataset.type) {
                        categorySelect.add(option.cloneNode(true));
                    }
                });
            }
        });

        // Trigger initial update if type is already selected
        if (typeSelect.value) {
            typeSelect.dispatchEvent(new Event('change'));
        }
    }
}

// grab fresh dashboard data based on timeframe
function updateDashboardData(timeframe) {
    // Fetch new data based on timeframe
    fetch(`/api/seller/dashboard-data?timeframe=${timeframe}`)
        .then(response => response.json())
        .then(data => {
            updateStats(data.stats);
            updateRecentOrders(data.recentOrders);
        })
        .catch(error => {
            console.error('Error updating dashboard:', error);
            showErrorAlert('Failed to update dashboard data');
        });
}

function updateStats(stats) {
    Object.keys(stats).forEach(key => {
        const element = document.querySelector(`#${key}Value`);
        if (element) {
            element.textContent = stats[key];
        }
    });
}

// show the latest orders in the table
function updateRecentOrders(orders) {
    const tableBody = document.querySelector('.order-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer}</td>
            <td>$${order.amount}</td>
            <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
            <td>${order.date}</td>
        </tr>
    `).join('');
}

function showErrorAlert(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger alert-dismissible fade show';
    alertElement.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const container = document.querySelector('.seller-dashboard');
    if (container) {
        container.insertBefore(alertElement, container.firstChild);
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

    const container = document.querySelector('.seller-dashboard');
    if (container) {
        container.insertBefore(alertElement, container.firstChild);
    }
}
