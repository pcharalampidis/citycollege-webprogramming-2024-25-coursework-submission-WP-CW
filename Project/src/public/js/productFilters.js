document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const sortSelect = document.querySelector('.sort-select');
    const applyButton = document.querySelector('.apply-filters');
    const filterDropdownBtn = document.querySelector('.filter-dropdown-btn');
    const additionalFilters = document.querySelector('.additional-filters');

    // Toggle additional filters
    filterDropdownBtn.addEventListener('click', function() {
        additionalFilters.classList.toggle('show');
        filterDropdownBtn.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!filterDropdownBtn.contains(e.target) && 
            !additionalFilters.contains(e.target)) {
            additionalFilters.classList.remove('show');
            filterDropdownBtn.classList.remove('active');
        }
    });

    // Function to update URL with filter parameters
    function updateFilters() {
        const searchParams = new URLSearchParams(window.location.search);
        
        // Update search parameter
        if (searchInput.value) {
            searchParams.set('search', searchInput.value);
        } else {
            searchParams.delete('search');
        }

        // Update sort parameter
        if (sortSelect.value) {
            searchParams.set('sort', sortSelect.value);
        } else {
            searchParams.delete('sort');
        }

        // Update additional filter parameters
        const additionalInputs = additionalFilters.querySelectorAll('input, select');
        additionalInputs.forEach(input => {
            if (input.value) {
                searchParams.set(input.name, input.value);
            } else {
                searchParams.delete(input.name);
            }
        });

        // Keep category if it exists
        const category = searchParams.get('category');
        if (!category) {
            searchParams.delete('category');
        }

        // Construct the new URL
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.location.href = newUrl;
    }

    // Handle form submission
    applyButton.addEventListener('click', function(e) {
        e.preventDefault();
        updateFilters();
    });

    // Handle enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            updateFilters();
        }
    });

    // Optional: Auto-submit on sort change
    sortSelect.addEventListener('change', function() {
        updateFilters();
    });

    // Initialize dropdown state based on whether any additional filters are active
    function checkActiveFilters() {
        const additionalInputs = additionalFilters.querySelectorAll('input, select');
        const hasActiveFilters = Array.from(additionalInputs).some(input => input.value);
        if (hasActiveFilters) {
            filterDropdownBtn.classList.add('active');
            additionalFilters.classList.add('show');
        }
    }

    // Check active filters on page load
    checkActiveFilters();
});
