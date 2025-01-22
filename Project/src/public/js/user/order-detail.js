document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize status update buttons
    const statusButtons = document.querySelectorAll('[data-status-action]');
    statusButtons.forEach(button => {
        button.addEventListener('click', handleStatusUpdate);
    });

    // Initialize tracking timeline
    initializeTrackingTimeline();
});

async function handleStatusUpdate(event) {
    event.preventDefault();
    const orderId = this.dataset.orderId;
    const newStatus = this.dataset.statusAction;
    
    if (newStatus === 'cancel' && !confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    try {
        const response = await fetch(`/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                status: newStatus === 'cancel' ? 'Cancelled' : 'Completed' 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Order status has been updated successfully.`, 'success');
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

function initializeTrackingTimeline() {
    const timeline = document.querySelector('.tracking-timeline');
    if (!timeline) return;

    // Add animation classes to timeline steps
    const steps = timeline.querySelectorAll('.tracking-step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('animate__animated', 'animate__fadeInLeft');
        }, index * 200);
    });
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

// Handle print order
document.querySelector('#printOrder')?.addEventListener('click', function() {
    window.print();
});

// Handle download invoice
document.querySelector('#downloadInvoice')?.addEventListener('click', async function() {
    const orderId = this.dataset.orderId;
    try {
        const response = await fetch(`/orders/${orderId}/invoice`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            showNotification('Failed to download invoice.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while downloading the invoice.', 'error');
    }
});
