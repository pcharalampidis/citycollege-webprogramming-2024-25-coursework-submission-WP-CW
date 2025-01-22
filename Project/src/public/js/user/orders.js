document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize status update buttons
    const statusButtons = document.querySelectorAll('[data-order-status]');
    statusButtons.forEach(button => {
        button.addEventListener('click', handleStatusUpdate);
    });
});

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Order #${orderId} has been ${newStatus.toLowerCase()}.`, 'success');
            // Refresh the page to show updated status
            location.reload();
        } else {
            showNotification(data.message || 'Failed to update order status.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while updating the order.', 'error');
    }
}

async function handleStatusUpdate(event) {
    const orderId = this.dataset.orderId;
    const newStatus = this.dataset.orderStatus;
    
    if (newStatus === 'Cancelled' && !confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    await updateOrderStatus(orderId, newStatus);
}

function showNotification(message, type) {
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

// Handle pagination
document.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', function(e) {
        if (!this.parentElement.classList.contains('disabled')) {
            const page = this.dataset.page;
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('page', page);
            window.location.href = currentUrl.toString();
        }
    });
});

// Handle sorting
document.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', function() {
        const sortField = this.dataset.sort;
        const currentUrl = new URL(window.location.href);
        const currentSort = currentUrl.searchParams.get('sort');
        const currentOrder = currentUrl.searchParams.get('order');
        
        let newOrder = 'asc';
        if (currentSort === sortField && currentOrder === 'asc') {
            newOrder = 'desc';
        }
        
        currentUrl.searchParams.set('sort', sortField);
        currentUrl.searchParams.set('order', newOrder);
        window.location.href = currentUrl.toString();
    });
});
