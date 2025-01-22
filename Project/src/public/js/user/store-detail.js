document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Handle stock status display
    updateStockStatus();

    // Initialize product filters if they exist
    initializeFilters();

    // Initialize store map if coordinates are available
    initializeStoreMap();
});

function updateStockStatus() {
    const stockElements = document.querySelectorAll('.stock-info');
    stockElements.forEach(element => {
        const stock = parseInt(element.textContent);
        if (stock <= 5 && stock > 0) {
            element.classList.add('low-stock');
        } else if (stock === 0) {
            element.classList.add('out-of-stock');
        }
    });
}

function initializeFilters() {
    const filterForm = document.querySelector('#filterForm');
    if (!filterForm) return;

    // Handle category filter
    const categorySelect = filterForm.querySelector('#categoryFilter');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            filterForm.submit();
        });
    }

    // Handle price range filter
    const priceRange = filterForm.querySelector('#priceRange');
    const priceOutput = filterForm.querySelector('#priceOutput');
    if (priceRange && priceOutput) {
        priceRange.addEventListener('input', (e) => {
            priceOutput.textContent = `€${e.target.value}`;
        });
    }

    // Handle search input
    const searchInput = filterForm.querySelector('#searchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                filterForm.submit();
            }, 500);
        });
    }
}

function initializeStoreMap() {
    const mapContainer = document.querySelector('#storeMap');
    if (!mapContainer) return;

    const lat = parseFloat(mapContainer.dataset.lat);
    const lng = parseFloat(mapContainer.dataset.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    // Initialize map (using your preferred map provider)
    // This is just a placeholder - replace with your actual map implementation
    const map = new google.maps.Map(mapContainer, {
        center: { lat, lng },
        zoom: 15
    });

    new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: document.querySelector('.store-title').textContent
    });
}

// Handle contact form submission
const contactForm = document.querySelector('#contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(this);
            const response = await fetch('/contact-store', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (response.ok) {
                showNotification('Message sent successfully!', 'success');
                this.reset();
            } else {
                showNotification(data.message || 'Failed to send message.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('An error occurred while sending the message.', 'error');
        }
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
