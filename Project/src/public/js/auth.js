document.addEventListener('DOMContentLoaded', function() {
    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            let errorMessages = [];
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            // make sure all the required fields are filled in
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    highlightError(field);
                    errorMessages.push(`Field "${field.name}" is required`);
                } else {
                    removeError(field);
                }
            });

            // Validate password fields
            const passwordFields = form.querySelectorAll('input[type="password"]');
            passwordFields.forEach(field => {
                const passErrors = validatePassword(field);
                if (passErrors.length > 0) {
                    isValid = false;
                    errorMessages = errorMessages.concat(passErrors);
                }
            });

            // Validate email fields
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                const emailErrors = validateEmail(field);
                if (emailErrors.length > 0) {
                    isValid = false;
                    errorMessages = errorMessages.concat(emailErrors);
                }
            });

            // Show errors if any
            if (!isValid) {
                e.preventDefault();
                showAlert(errorMessages.join(' | '), 'danger');
            }
        });
    });

    // Alert auto-dismiss
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        const closeBtn = alert.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alert.remove();
            });
        }
        setTimeout(() => {
            alert.remove();
        }, 5000);
    });
});

// Utility functions
function highlightError(field) {
    field.classList.add('is-invalid');
    field.style.borderColor = '#dc3545';
}

// puts the field back to normal when fixed
function removeError(field) {
    field.classList.remove('is-invalid');
    field.style.borderColor = '';
}

// checks if the password is secure 
function validatePassword(field) {
    const password = field.value;
    const minLength = 8;
    let errors = [];

    if (password.length < minLength) {
        highlightError(field);
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        highlightError(field);
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        highlightError(field);
        errors.push('Password must contain at least one number');
    }
    if (errors.length === 0) {
        removeError(field);
    }
    return errors;
}

// validate email adress
function validateEmail(field) {
    const email = field.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let errors = [];
    
    if (!emailRegex.test(email)) {
        highlightError(field);
        errors.push('Please enter a valid email address');
    } else {
        removeError(field);
    }
    return errors;
}

function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'danger' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert alert at the top of the form
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(alertDiv, form.firstChild);
    }

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
