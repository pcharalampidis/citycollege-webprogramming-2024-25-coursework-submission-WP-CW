// Initialize UI components
const initUI = {
    tooltips: () => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => new bootstrap.Tooltip(el));
    },

    search: () => {
        const form = document.querySelector('form[action="/search"]');
        if (!form) return;

        form.addEventListener('submit', e => {
            const input = form.querySelector('input[name="q"]');
            if (!input.value.trim()) {
                e.preventDefault();
                input.classList.add('is-invalid');
            }
        });
    },

    quantityInputs: () => {
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', () => {
                const min = parseInt(input.getAttribute('min')) || 1;
                const max = parseInt(input.getAttribute('max')) || 99;
                input.value = Math.max(min, Math.min(max, parseInt(input.value) || min));
            });
        });
    },

    addToCartButtons: () => {
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.add('btn-success');
                this.innerHTML = '&#10003; Added';
                setTimeout(() => {
                    this.classList.remove('btn-success');
                    this.innerHTML = 'Add to Cart';
                }, 2000);
            });
        });
    }
};

// Initialize all UI components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Object.values(initUI).forEach(init => init());
});
