document.addEventListener('DOMContentLoaded', function() {
    const productTypeSelect = document.getElementById('productType');
    const categorySelect = document.getElementById('category');
    const dynamicFields = document.getElementById('dynamicFields');
    
    // Field configurations for each product type
    const fieldConfigs = {
        'Books': {
            fields: `
                <div class="form-group mb-3">
                    <label for="authorName" class="form-label required">Author Name</label>
                    <input type="text" id="authorName" name="authorName" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label for="isbn" class="form-label required">ISBN</label>
                    <input type="text" id="isbn" name="isbn" class="form-control" required 
                           pattern="^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$">
                </div>
                <div class="form-group mb-3">
                    <label for="publicationYear" class="form-label required">Publication Year</label>
                    <input type="number" id="publicationYear" name="publicationYear" class="form-control" 
                           min="1800" max="2025" required>
                </div>
            `
        },
        'Electronics': {
            fields: `
                <div class="form-group mb-3">
                    <label for="brand" class="form-label required">Brand</label>
                    <input type="text" id="brand" name="brand" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label for="model" class="form-label required">Model</label>
                    <input type="text" id="model" name="model" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label for="specification" class="form-label required">Technical Specifications</label>
                    <textarea id="specification" name="specification" class="form-control" rows="4" required></textarea>
                </div>
            `
        },
        'Clothing': {
            fields: `
                <div class="form-group mb-3">
                    <label for="brand" class="form-label required">Brand</label>
                    <input type="text" id="brand" name="brand" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label for="sizes" class="form-label required">Available Sizes</label>
                    <select id="sizes" name="sizes[]" class="form-control" multiple required>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                    </select>
                    <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple sizes</small>
                </div>
                <div class="form-group mb-3">
                    <label for="colors" class="form-label required">Available Colors</label>
                    <div id="colorPicker" class="color-picker">
                        <div class="color-swatch" data-color="Black" style="background-color: #000000;"></div>
                        <div class="color-swatch" data-color="White" style="background-color: #FFFFFF;"></div>
                        <div class="color-swatch" data-color="Red" style="background-color: #FF0000;"></div>
                        <div class="color-swatch" data-color="Blue" style="background-color: #0000FF;"></div>
                        <div class="color-swatch" data-color="Green" style="background-color: #00FF00;"></div>
                        <div class="color-swatch" data-color="Yellow" style="background-color: #FFFF00;"></div>
                        <div class="color-swatch" data-color="Purple" style="background-color: #800080;"></div>
                        <div class="color-swatch" data-color="Gray" style="background-color: #808080;"></div>
                    </div>
                    <input type="hidden" id="selectedColors" name="colors" required>
                </div>
                <div class="form-group mb-3">
                    <label for="material" class="form-label required">Material</label>
                    <input type="text" id="material" name="material" class="form-control" required>
                </div>
            `
        },
        'Home & Garden': {
            fields: `
                <div class="form-group mb-3">
                    <label for="brand" class="form-label required">Brand</label>
                    <input type="text" id="brand" name="brand" class="form-control" required>
                </div>
                <div class="form-group mb-3">
                    <label for="specification" class="form-label required">Specifications</label>
                    <textarea id="specification" name="specification" class="form-control" rows="4" required></textarea>
                </div>
            `
        }
    };

    // Handle product type change
    productTypeSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const selectedTypeName = selectedOption ? selectedOption.textContent.trim() : '';
        const selectedTypeId = this.value;

        // Enable/disable category select
        categorySelect.disabled = !selectedTypeId;
        
        // Update form fields based on type
        if (selectedTypeName && fieldConfigs[selectedTypeName]) {
            dynamicFields.innerHTML = fieldConfigs[selectedTypeName].fields;
            initializeTypeSpecificFeatures(selectedTypeName);
        } else {
            dynamicFields.innerHTML = '';
        }

        // Filter categories
        updateCategoryOptions(selectedTypeId);
    });

    // Update category options based on product type
    function updateCategoryOptions(typeId) {
        Array.from(categorySelect.options).forEach(option => {
            if (option.value === '') return; // Skip placeholder option
            option.style.display = (!typeId || option.getAttribute('data-type') === typeId) ? '' : 'none';
        });

        // Reset selection and check if we have valid options
        categorySelect.value = '';
        let hasValidOptions = Array.from(categorySelect.options).some(option => 
            option.style.display !== 'none' && option.value !== ''
        );
        categorySelect.disabled = !hasValidOptions;
    }

    // Initialize type-specific features
    function initializeTypeSpecificFeatures(type) {
        if (type === 'Clothing') {
            initializeColorPicker();
        }
    }

    // Initialize color picker for clothing
    function initializeColorPicker() {
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', function() {
                this.classList.toggle('selected');
                updateSelectedColors();
            });
        });
    }

    // Update selected colors input
    function updateSelectedColors() {
        const selectedColors = Array.from(document.querySelectorAll('.color-swatch.selected'))
            .map(swatch => swatch.getAttribute('data-color'));
        document.getElementById('selectedColors').value = selectedColors.join(',');
    }

    // Initialize the form if a product type is already selected
    if (productTypeSelect.value) {
        productTypeSelect.dispatchEvent(new Event('change'));
    }
});
