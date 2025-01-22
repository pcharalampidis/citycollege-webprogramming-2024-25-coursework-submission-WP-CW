document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('productForm');
    const productId = new URLSearchParams(window.location.search).get('id');
    
    if (productId) {
        // If productId exists, we're in edit mode
        loadProductData(productId);
        document.querySelector('h1').textContent = 'Edit Product';
    }

    form.addEventListener('submit', handleSubmit);
});

async function loadProductData(productId) {
    try {
        const response = await fetch(`/api/seller/products/${productId}`);
        if (!response.ok) throw new Error('Failed to fetch product data');
        
        const product = await response.json();
        fillFormWithProductData(product);
    } catch (error) {
        showErrorAlert('Failed to load product data');
        console.error(error);
    }
}

function fillFormWithProductData(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description;
    // Handle image preview if exists
    if (product.image) {
        document.getElementById('imagePreview').src = product.image;
        document.getElementById('imagePreview').style.display = 'block';
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    
    const productId = new URLSearchParams(window.location.search).get('id');
    const formData = new FormData(event.target);
    const url = productId 
        ? `/api/seller/products/${productId}`
        : '/api/seller/products';
    const method = productId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            body: formData
        });

        if (!response.ok) throw new Error('Failed to save product');
        
        showSuccessAlert('Product saved successfully');
        setTimeout(() => {
            window.location.href = '/seller/dashboard';
        }, 1500);
    } catch (error) {
        showErrorAlert('Failed to save product');
        console.error(error);
    }
}

function showErrorAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.textContent = message;
    document.querySelector('.container').insertBefore(alert, document.querySelector('form'));
    setTimeout(() => alert.remove(), 3000);
}

function showSuccessAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    document.querySelector('.container').insertBefore(alert, document.querySelector('form'));
    setTimeout(() => alert.remove(), 3000);
}
