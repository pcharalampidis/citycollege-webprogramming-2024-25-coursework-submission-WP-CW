document.addEventListener('DOMContentLoaded', () => {
    initializeProfile();
});

function initializeProfile() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const userId = form.dataset.userId;

    try {
        const response = await fetch(`/user/profile/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'Profile updated successfully');
        } else {
            throw new Error(result.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', error.message);
    }
}

async function handlePasswordUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const userId = form.dataset.userId;

    try {
        const response = await fetch(`/user/profile/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        const result = await response.json();
        
        if (response.ok) {
            showAlert('success', 'Password updated successfully');
            form.reset();
        } else {
            throw new Error(result.message || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', error.message);
    }
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.profile-container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
        alert.close();
    }, 3000);
}
