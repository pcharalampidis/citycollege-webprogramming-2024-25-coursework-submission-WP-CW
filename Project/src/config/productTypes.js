const productTypes = {
    1: { // Books
        name: 'Books',
        fields: [
            { name: 'name', label: 'Book Title', type: 'text', required: true },
            { name: 'authorId', label: 'Author', type: 'select', required: true, dynamicOptions: 'authors' },
            { name: 'isbn', label: 'ISBN', type: 'text', required: true },
            { name: 'publicationYear', label: 'Publication Year', type: 'number', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
            { name: 'categoryId', label: 'Category', type: 'select', required: true, dynamicOptions: 'categories' }
        ]
    },
    2: { // Electronics
        name: 'Electronics',
        fields: [
            { name: 'name', label: 'Product Name', type: 'text', required: true },
            { name: 'brand', label: 'Brand', type: 'text', required: true },
            { name: 'model', label: 'Model', type: 'text', required: true },
            { name: 'specification', label: 'Specifications', type: 'textarea', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
            { name: 'categoryId', label: 'Category', type: 'select', required: true, dynamicOptions: 'categories' }
        ]
    },
    3: { // Clothing
        name: 'Clothing',
        fields: [
            { name: 'name', label: 'Product Name', type: 'text', required: true },
            { name: 'brand', label: 'Brand', type: 'text', required: true },
            { name: 'specification', label: 'Details', type: 'textarea', required: true, placeholder: 'Size, Color, Material, etc.' },
            { name: 'description', label: 'Description', type: 'textarea', required: true },
            { name: 'categoryId', label: 'Category', type: 'select', required: true, dynamicOptions: 'categories' }
        ]
    }
};

module.exports = productTypes;
