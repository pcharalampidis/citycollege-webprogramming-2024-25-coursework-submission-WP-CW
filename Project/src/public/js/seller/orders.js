document.addEventListener('DOMContentLoaded', function() {
    // Initialize filters
    initializeFilters();
    
    // Setup date range picker
    setupDateRangePicker();
    
    // Setup order actions
    setupOrderActions();
    
    // Initialize pagination
    initializePagination();
});

function initializeFilters() {
    const filters = document.querySelectorAll('.filter-group select');
    filters.forEach(filter => {
        filter.addEventListener('change', function() {
            applyFilters();
        });
    });
}

function setupDateRangePicker() {
    const dateRange = document.querySelector('#dateRange');
    if (dateRange) {
        flatpickr(dateRange, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) {
                    applyFilters();
                }
            }
        });
    }
}

function setupOrderActions() {
    // View order details
    document.querySelectorAll('.view-order-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const orderId = this.dataset.orderId;
            viewOrderDetails(orderId);
        });
    });

    // Update order status
    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const orderId = this.dataset.orderId;
            const currentStatus = this.dataset.currentStatus;
            showStatusUpdateModal(orderId, currentStatus);
        });
    });
}

function initializePagination() {
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.addEventListener('click', function(e) {
            if (e.target.classList.contains('page-btn')) {
                e.preventDefault();
                const page = e.target.dataset.page;
                loadPage(page);
            }
        });
    }
}

function applyFilters() {
    const filters = {
        status: document.querySelector('#statusFilter')?.value,
        dateRange: document.querySelector('#dateRange')?.value,
        search: document.querySelector('#searchOrder')?.value
    };

    // Show loading state
    showLoading();

    // Fetch filtered orders
    fetch('/api/seller/orders/filter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
    })
    .then(response => response.json())
    .then(data => {
        updateOrdersTable(data.orders);
        updatePagination(data.pagination);
        hideLoading();
    })
    .catch(error => {
        console.error('Error applying filters:', error);
        showErrorAlert('Failed to apply filters');
        hideLoading();
    });
}

function updateOrdersTable(orders) {
    const tableBody = document.querySelector('.orders-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer}</td>
            <td>$${order.amount}</td>
            <td>
                <span class="status-badge status-${order.status.toLowerCase()}">
                    ${order.status}
                </span>
            </td>
            <td>${order.date}</td>
            <td>
                <button class="action-btn view-btn view-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn edit-btn update-status-btn" 
                        data-order-id="${order.id}" 
                        data-current-status="${order.status}">
                    <i class="fas fa-edit"></i> Update Status
                </button>
            </td>
        </tr>
    `).join('');

    // Reinitialize order actions
    setupOrderActions();
}

function updatePagination(pagination) {
    const paginationElement = document.querySelector('.pagination');
    if (!paginationElement) return;

    let html = '';
    if (pagination.currentPage > 1) {
        html += `<button class="page-btn" data-page="${pagination.currentPage - 1}">Previous</button>`;
    }
    
    for (let i = 1; i <= pagination.totalPages; i++) {
        html += `
            <button class="page-btn ${i === pagination.currentPage ? 'active' : ''}" 
                    data-page="${i}">${i}</button>
        `;
    }
    
    if (pagination.currentPage < pagination.totalPages) {
        html += `<button class="page-btn" data-page="${pagination.currentPage + 1}">Next</button>`;
    }

    paginationElement.innerHTML = html;
}

function viewOrderDetails(orderId) {
    // Fetch order details
    fetch(`/api/seller/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            showOrderDetailsModal(data);
        })
        .catch(error => {
            console.error('Error fetching order details:', error);
            showErrorAlert('Failed to load order details');
        });
}

function showOrderDetailsModal(order) {
    const modalHtml = `
        <div class="modal fade" id="orderDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Order #${order.id} Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="order-details">
                            <div class="detail-card">
                                <h4>Customer Information</h4>
                                <p>${order.customer.name}</p>
                                <p>${order.customer.email}</p>
                                <p>${order.customer.phone}</p>
                            </div>
                            <div class="detail-card">
                                <h4>Shipping Address</h4>
                                <p>${order.shippingAddress}</p>
                            </div>
                            <div class="detail-card">
                                <h4>Order Status</h4>
                                <p>
                                    <span class="status-badge status-${order.status.toLowerCase()}">
                                        ${order.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <table class="table mt-4">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>$${item.price}</td>
                                        <td>$${item.quantity * item.price}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                    <td><strong>$${order.total}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize and show modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
    
    // Clean up on hide
    document.getElementById('orderDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function showStatusUpdateModal(orderId, currentStatus) {
    const modalHtml = `
        <div class="modal fade" id="statusUpdateModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Update Order Status</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="newStatus">New Status</label>
                            <select class="form-control" id="newStatus">
                                <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Processing" ${currentStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                                <option value="Completed" ${currentStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="updateOrderStatus('${orderId}')">Update</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize and show modal
    const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
    modal.show();
    
    // Clean up on hide
    document.getElementById('statusUpdateModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function updateOrderStatus(orderId) {
    const newStatus = document.querySelector('#newStatus').value;
    
    fetch(`/api/seller/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();
            // Refresh orders table
            applyFilters();
            showSuccessAlert('Order status updated successfully');
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showErrorAlert('Failed to update order status');
    });
}

function loadPage(page) {
    const currentFilters = {
        status: document.querySelector('#statusFilter')?.value,
        dateRange: document.querySelector('#dateRange')?.value,
        search: document.querySelector('#searchOrder')?.value,
        page: page
    };

    // Show loading state
    showLoading();

    // Fetch page data
    fetch('/api/seller/orders/page', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentFilters)
    })
    .then(response => response.json())
    .then(data => {
        updateOrdersTable(data.orders);
        updatePagination(data.pagination);
        hideLoading();
    })
    .catch(error => {
        console.error('Error loading page:', error);
        showErrorAlert('Failed to load page');
        hideLoading();
    });
}

function showLoading() {
    const table = document.querySelector('.orders-table');
    if (table) {
        table.style.opacity = '0.5';
    }
}

function hideLoading() {
    const table = document.querySelector('.orders-table');
    if (table) {
        table.style.opacity = '1';
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
    
    const container = document.querySelector('.orders-container');
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
    
    const container = document.querySelector('.orders-container');
    if (container) {
        container.insertBefore(alertElement, container.firstChild);
    }
}
