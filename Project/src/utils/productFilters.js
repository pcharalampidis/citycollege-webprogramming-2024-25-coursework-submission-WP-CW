// here's where we do all the fancy filtering magik
// Filtering functions and implementation
function filterProducts(products, filters) {
    console.log('Starting filtering with:', {
        totalProducts: products.length,
        appliedFilters: Object.entries(filters).filter(([_, v]) => v).reduce((acc, [k, v]) => ({...acc, [k]: v}), {})
    });

    let filteredProducts = [...products];

    // search filter (name, description, author)
    if (filters.search) {
        console.log('Filtering by search:', filters.search);
        const searchTerm = filters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            (product.Name?.toLowerCase().includes(searchTerm)) ||
            (product.Description?.toLowerCase().includes(searchTerm)) ||
            (product.AuthorName?.toLowerCase().includes(searchTerm))
        );
        console.log('Products after search filter:', filteredProducts.length);
    }

    // filter based on what kinda product 
    if (filters.type) {
        console.log('Filtering by type:', filters.type);
        filteredProducts = filteredProducts.filter(product => 
            product.Type_ID?.toString() === filters.type.toString()
        );
        console.log('Products after type filter:', filteredProducts.length);
    }

    // Category filter
    if (filters.category) {
        console.log('Filtering by category:', filters.category);
        filteredProducts = filteredProducts.filter(product => 
            product.CategoryName?.toLowerCase() === filters.category.toLowerCase()
        );
        console.log('Products after category filter:', filteredProducts.length);
    }

    // Brand filter
    if (filters.brand) {
        console.log('Filtering by brand:', filters.brand);
        filteredProducts = filteredProducts.filter(product => 
            product.Brand?.toLowerCase().includes(filters.brand.toLowerCase())
        );
        console.log('Products after brand filter:', filteredProducts.length);
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
        console.log('Filtering by price range:', { min: filters.minPrice, max: filters.maxPrice });
        filteredProducts = filteredProducts.filter(product => {
            const price = parseFloat(product.MinPrice || 0);
            const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
            const max = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
            return price >= min && price <= max;
        });
        console.log('Products after price filter:', filteredProducts.length);
    }

    return filteredProducts;
}

// Sorting function
function sortProducts(products, sortBy = 'name_asc') {
    console.log('Sorting products by:', sortBy);
    
    const sortedProducts = [...products];
    
    switch (sortBy) {
        case 'price_asc':
            return sortedProducts.sort((a, b) => {
                const aPrice = a.MinPrice ? parseFloat(a.MinPrice) : Infinity;
                const bPrice = b.MinPrice ? parseFloat(b.MinPrice) : Infinity;
                return aPrice - bPrice;
            });
        case 'price_desc':
            return sortedProducts.sort((a, b) => {
                const aPrice = a.MinPrice ? parseFloat(a.MinPrice) : -Infinity;
                const bPrice = b.MinPrice ? parseFloat(b.MinPrice) : -Infinity;
                return bPrice - aPrice;
            });
        case 'name_desc':
            return sortedProducts.sort((a, b) => (b.Name || '').localeCompare(a.Name || ''));
        case 'name_asc':
        default:
            return sortedProducts.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
    }
}

module.exports = {
    filterProducts,
    sortProducts
};
