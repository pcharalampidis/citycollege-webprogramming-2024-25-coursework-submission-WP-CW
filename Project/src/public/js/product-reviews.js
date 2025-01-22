// Product Reviews functionality
document.addEventListener('DOMContentLoaded', () => {
    const reviewPopup = document.getElementById('reviewPopup');
    if (reviewPopup) {
        setTimeout(() => {
            reviewPopup.style.opacity = '0';
            setTimeout(() => reviewPopup.style.display = 'none', 500);
        }, 5000);
    }
    initializeStarRating();
    initializeReviewForm();
});

function initializeStarRating() {
    const starLabels = document.querySelectorAll('.star-rating label');
    
    starLabels.forEach(label => {
        // Hover effect
        label.addEventListener('mouseenter', () => {
            const currentRating = label.getAttribute('for').replace('star', '');
            updateStars(currentRating);
        });
        
        // Mouse leave - reset to selected rating
        label.addEventListener('mouseleave', () => {
            const selectedRating = document.querySelector('.star-rating input[type="radio"]:checked');
            updateStars(selectedRating ? selectedRating.value : 0);
        });
    });

    // Star container mouse leave - reset to selected rating
    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            const selectedRating = document.querySelector('.star-rating input[type="radio"]:checked');
            updateStars(selectedRating ? selectedRating.value : 0);
        });
    }
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.star-rating label');
    stars.forEach((star, index) => {
        const starValue = 5 - index;
        star.style.color = starValue <= rating ? '#6366F1' : '#e5e7eb';
        
        if (starValue <= rating) {
            star.style.transform = 'scale(1.1)';
            star.style.filter = 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.4))';
        } else {
            star.style.transform = 'scale(1)';
            star.style.filter = 'none';
        }
    });
}

function initializeReviewForm() {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', submitReview);
    }
}

async function submitReview(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const rating = form.rating.value;
    const comments = form.comments.value;

    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch('/api/product-reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: form.dataset.productId,
                orderId: form.dataset.orderId,
                rating,
                comments
            }),
            credentials: 'same-origin'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit review');
        }

        // Create and insert the new review
        const reviewsList = document.querySelector('.reviews-list');
        const emptyState = reviewsList.querySelector('.alert-light');
        if (emptyState) {
            emptyState.remove();
        }

        const newReview = createReviewElement({
            First_Name: document.querySelector('.navbar-nav .nav-link').textContent.trim(),
            Rating: rating,
            Comments: comments,
            Date: new Date()
        });

        reviewsList.insertBefore(newReview, reviewsList.firstChild);
        
        // Update review statistics
        updateReviewStats(parseFloat(rating));
        
        // Close modal and show success message
        const modal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
        modal.hide();
        
        showNotification('Review submitted successfully!', 'success');

        // Reset form
        form.reset();
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Error submitting review:', error);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Review';
    }
}

function createReviewElement(review) {
    const div = document.createElement('div');
    div.className = 'review-item card mb-3 new';
    
    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h5 class="mb-1">${review.First_Name}</h5>
                    <div class="stars">
                        ${Array.from({length: 5}, (_, i) => 
                            `<i class="fas fa-star ${i < review.Rating ? 'text-warning' : 'text-muted'}"></i>`
                        ).join('')}
                    </div>
                </div>
                <small class="text-muted">
                    ${new Date(review.Date).toLocaleDateString()}
                </small>
            </div>
            <p class="mb-0">${review.Comments}</p>
        </div>
    `;

    return div;
}

function updateReviewStats(newRating) {
    // Update total reviews count
    const totalReviewsElem = document.querySelector('.overall-rating p');
    const currentTotal = parseInt(totalReviewsElem.textContent.split(' ')[0]) + 1;
    totalReviewsElem.textContent = `${currentTotal} reviews`;

    // Update average rating
    const averageRatingElem = document.querySelector('.overall-rating h4');
    const oldAverage = parseFloat(averageRatingElem.textContent);
    const newAverage = ((oldAverage * (currentTotal - 1)) + parseInt(newRating)) / currentTotal;
    averageRatingElem.textContent = newAverage.toFixed(1);

    // Update star display
    const stars = document.querySelectorAll('.overall-rating .stars i');
    stars.forEach((star, index) => {
        if (index < Math.round(newAverage)) {
            star.classList.add('text-warning');
        } else {
            star.classList.remove('text-warning');
        }
    });

    // Update rating distribution
    const ratingBar = document.querySelector(`.rating-bar[data-rating="${Math.round(newRating)}"]`);
    if (ratingBar) {
        const countSpan = ratingBar.querySelector('span:last-child');
        const currentCount = parseInt(countSpan.textContent) + 1;
        countSpan.textContent = currentCount;

        // Update progress bar
        const progressBar = ratingBar.querySelector('.progress-bar');
        progressBar.style.width = `${(currentCount / currentTotal) * 100}%`;
        progressBar.setAttribute('aria-valuenow', currentCount);
        progressBar.setAttribute('aria-valuemax', currentTotal);
    }

    // Update all progress bars percentages
    document.querySelectorAll('.rating-bar').forEach(bar => {
        const count = parseInt(bar.querySelector('span:last-child').textContent);
        const progressBar = bar.querySelector('.progress-bar');
        progressBar.style.width = `${(count / currentTotal) * 100}%`;
        progressBar.setAttribute('aria-valuemax', currentTotal);
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : 'success'} notification`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        padding: 1rem;
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease forwards;
    `;
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
            ${message}
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
