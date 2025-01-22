document.addEventListener('DOMContentLoaded', function() {
    initializeProductCards();
    initializeButtons();
    initializeAnimations();
});

function initializeProductCards() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // Card hover effect
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });

        // Make entire card clickable
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('action-button')) {
                const detailsButton = this.querySelector('.action-button');
                if (detailsButton) {
                    window.location.href = detailsButton.href;
                }
            }
        });
    });
}

function initializeButtons() {
    // Browse Catalog button
    const browseCatalogBtn = document.querySelector('.browse-catalog');
    if (browseCatalogBtn) {
        browseCatalogBtn.addEventListener('click', function() {
            window.location.href = '/products';
        });
    }

    // Wishlist button
    const wishlistBtn = document.querySelector('.secondary-action');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', function() {
            window.location.href = '/wishlist';
        });
    }
}

function initializeAnimations() {
    // Animate stats on scroll
    const stats = document.querySelectorAll('.stat-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    stats.forEach(stat => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(20px)';
        stat.style.transition = 'opacity 0.5s, transform 0.5s';
        observer.observe(stat);
    });
}

// Image error handling
function handleImageError(img) {
    img.onerror = null;  // Prevent infinite loop
    img.src = '/images/default.jpg';
}
