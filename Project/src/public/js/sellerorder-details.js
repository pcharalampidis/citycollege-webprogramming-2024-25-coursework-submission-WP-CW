document.addEventListener('DOMContentLoaded', function() {
    const updateStatusButton = document.getElementById('updateStatus');
    const statusSelect = document.getElementById('orderStatus');
    const orderId = document.getElementById('orderId').value;

    updateStatusButton.addEventListener('click', async function() {
        try {
            const newStatus = statusSelect.value;
            const response = await fetch(`/seller/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const result = await response.json();
            if (result.success) {
                // Show success message
                showNotification('Status updated successfully', 'success');
                // Reload page after a short delay
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showNotification('Failed to update status: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showNotification('Failed to update status. Please try again.', 'error');
        }
    });

    // Notification helper function
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});
