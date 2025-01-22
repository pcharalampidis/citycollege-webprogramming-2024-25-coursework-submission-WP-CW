const express = require('express');
const router = express.Router();
const pool = require('../db');
const { filterProducts, sortProducts } = require('../utils/productFilters');

// Get all products with filtering, sorting and pagination
router.get('/', async (req, res) => {
    try {
        console.log('Fetching products...');
        
        // Get current page from query params or default to 1
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 9;
        
        // Get total count
        console.log('Getting product count...');
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM PRODUCT');
        const totalProducts = countResult[0].total;
        console.log('Total products:', totalProducts);

        // Get categories for filter
        const [categories] = await pool.query('SELECT DISTINCT Name_Type FROM CATEGORIES ORDER BY Name_Type');

        // Get all products with their details
        console.log('Getting all products...');
        const [products] = await pool.query(`
            SELECT DISTINCT
                p.Product_ID,
                p.Name,
                p.Type_ID,
                p.Specification,
                p.Description,
                p.Category_ID,
                p.Image_URL,
                p.Publication_Year,
                p.ISBN,
                p.Brand,
                p.Model,
                a.Name as AuthorName,
                a.Biography as AuthorBio,
                c.Name_Type as CategoryName,
                pt.Type_Name as ProductType,
                COALESCE(MIN(ps.Price), 0) as MinPrice,
                COALESCE(MAX(ps.Price), 0) as MaxPrice,
                COUNT(DISTINCT ps.Store_ID) as StoreCount,
                COALESCE(SUM(ps.Stock), 0) as TotalStock,
                GROUP_CONCAT(DISTINCT ps.Store_ID) as StoreIDs,
                (
                    SELECT Store_ID 
                    FROM PRODUCT_STORE ps2 
                    WHERE ps2.Product_ID = p.Product_ID 
                    AND ps2.Price = MIN(ps.Price)
                    LIMIT 1
                ) as BestStoreID
            FROM PRODUCT p
            LEFT JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
            LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
            LEFT JOIN PRODUCT_TYPES pt ON p.Type_ID = pt.Type_ID
            GROUP BY 
                p.Product_ID, p.Name, p.Type_ID, p.Specification, 
                p.Description, p.Category_ID, p.Image_URL,
                p.Publication_Year, p.ISBN, p.Brand, p.Model,
                a.Name, a.Biography, c.Name_Type, pt.Type_Name
            HAVING TotalStock > 0
        `);

        console.log('Products fetched:', products.length);

        // Get product types for filters
        const productTypes = await getProductTypes();

        // Prepare filters from query parameters
        const filters = {
            search: req.query.search || '',
            type: req.query.type || '',
            category: req.query.category || '',
            brand: req.query.brand || '',
            minPrice: req.query.minPrice || '',
            maxPrice: req.query.maxPrice || '',
            page: page
        };

        // Apply filters
        let filteredProducts = products;
        if (Object.values(filters).some(v => v && v !== page)) {
            filteredProducts = filterProducts(products, filters);
        }

        // Apply sorting
        const sortBy = req.query.sort || 'name_asc';
        filteredProducts = sortProducts(filteredProducts, sortBy);

        // Calculate pagination values
        const totalFilteredProducts = filteredProducts.length;
        const totalPages = Math.ceil(totalFilteredProducts / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        // Get paginated products
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        res.render('products', {
            products: paginatedProducts,
            productTypes,
            categories,
            filters,
            totalProducts,
            filteredCount: totalFilteredProducts,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                pages: Array.from({length: totalPages}, (_, i) => i + 1)
            },
            user: req.session.user,
            title: 'Products'
        });

    } catch (error) {
        console.error('Error in products route:', error);
        res.status(500).render('error', {
            message: 'Error fetching products',
            error: error
        });
    }
});

// Get product types for filter dropdown
async function getProductTypes() {
    try {
        const [types] = await pool.query('SELECT Type_ID, Type_Name FROM PRODUCT_TYPES');
        return types;
    } catch (err) {
        console.error('Error fetching product types:', err);
        return [];
    }
}

// Get store by ID
router.get('/store/:id', async (req, res) => {
  try {
    console.log('Fetching store by ID...');
    const [store] = await pool.query(`
      SELECT s.*, 
        COUNT(DISTINCT ps.Product_ID) as total_products,
        AVG(ps.Price) as average_price
      FROM STORE s
      LEFT JOIN PRODUCT_STORE ps ON s.Store_ID = ps.Store_ID
      WHERE s.Store_ID = ?
      GROUP BY s.Store_ID
    `, [req.params.id]);

    if (store.length === 0) {
      console.log('Store not found');
      if (req.headers.accept === 'application/json') {
        return res.status(404).json({ message: 'Store not found' });
      }
      return res.render('error', { error: { message: 'Store not found' } });
    }

    // Get store's products
    const [products] = await pool.query(`
      SELECT 
        p.*,
        a.Name as AuthorName,
        a.Biography as AuthorBio,
        c.Name_Type as CategoryName,
        pt.Type_Name as ProductType,
        ps.Price,
        ps.Stock,
        1 as StoreCount
      FROM PRODUCT p
      JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
      LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
      LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
      LEFT JOIN PRODUCT_TYPES pt ON p.Type_ID = pt.Type_ID
      WHERE ps.Store_ID = ? AND ps.Stock > 0
      ORDER BY p.Name
    `, [req.params.id]);

    store[0].products = products;
    console.log('Store found:', store[0].Name);

    if (req.headers.accept === 'application/json') {
      return res.json(store[0]);
    }

    console.log('Rendering store detail page...');
    res.render('store-details', { store: store[0] });
  } catch (error) {
    console.error('Error in store detail route:', error);
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

// Get product by ID - must be after /store route
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.userId;

        // Get product details
        const [product] = await pool.query(`
            SELECT 
                p.*,
                a.Name as AuthorName,
                a.Biography as AuthorBio,
                a.Birth_Year as AuthorBirthYear,
                a.Death_Year as AuthorDeathYear,
                c.Name_Type as CategoryName,
                pt.Type_Name as ProductType,
                COALESCE(
                    JSON_ARRAYAGG(
                        IF(s.Store_ID IS NOT NULL,
                            JSON_OBJECT(
                                'store_id', s.Store_ID,
                                'store_name', s.Name,
                                'price', ps.Price,
                                'stock', ps.Stock,
                                'rating', s.Rating,
                                'address', s.Address,
                                'phone', s.Phone,
                                'email', s.Email
                            ),
                            NULL
                        )
                    ),
                    '[]'
                ) as stores
            FROM PRODUCT p
            LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
            LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
            LEFT JOIN PRODUCT_TYPES pt ON p.Type_ID = pt.Type_ID
            LEFT JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            LEFT JOIN STORE s ON ps.Store_ID = s.Store_ID
            WHERE p.Product_ID = ?
            GROUP BY p.Product_ID, p.Name, p.Type_ID, p.Specification, p.Description,
                     p.Category_ID, p.Image_URL, p.Publication_Year, p.ISBN,
                     p.Brand, p.Model, a.Name, a.Biography, a.Birth_Year, 
                     a.Death_Year, c.Name_Type, pt.Type_Name
        `, [req.params.id]);

        if (!product || product.length === 0) {
            console.log('Product not found:', req.params.id);
            return res.status(404).render('error', { 
                message: 'Product not found',
                error: { status: 404 }
            });
        }

        // Get user's order for this product (if exists)
        let order = null;
        let userCanReview = false;
        if (userId) {
            const [userOrder] = await pool.query(`
                SELECT * FROM \`ORDER\` 
                WHERE User_ID = ? AND Product_ID = ? AND Status = 'delivered'
                ORDER BY Date DESC LIMIT 1
            `, [userId, productId]);
            order = userOrder[0];
            
            if (order) {
                // Check if user has already reviewed this product
                const [existingReview] = await pool.query(`
                    SELECT * FROM PRODUCT_REVIEW 
                    WHERE User_ID = ? AND Product_ID = ?
                `, [userId, productId]);
                
                userCanReview = existingReview.length === 0;
            }
        }

        // Get review statistics
        const [stats] = await pool.query(`
            SELECT 
                AVG(Rating) as average_rating, 
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN Rating >= 4.5 THEN 1 END) as five_star,
                COUNT(CASE WHEN Rating >= 3.5 AND Rating < 4.5 THEN 1 END) as four_star,
                COUNT(CASE WHEN Rating >= 2.5 AND Rating < 3.5 THEN 1 END) as three_star,
                COUNT(CASE WHEN Rating >= 1.5 AND Rating < 2.5 THEN 1 END) as two_star,
                COUNT(CASE WHEN Rating < 1.5 THEN 1 END) as one_star
            FROM PRODUCT_REVIEW
            WHERE Product_ID = ?
        `, [productId]);

        // Get reviews
        const [reviews] = await pool.query(`
            SELECT pr.*, u.First_Name, u.Last_Name 
            FROM PRODUCT_REVIEW pr
            JOIN USER u ON pr.User_ID = u.Username_Id
            WHERE pr.Product_ID = ?
            ORDER BY pr.Date DESC
        `, [productId]);

        // Handle stores data
        try {
            // Parse stores if it's a string
            if (typeof product[0].stores === 'string') {
                product[0].stores = JSON.parse(product[0].stores);
            }

            // Ensure stores is an array and format data
            if (!Array.isArray(product[0].stores)) {
                product[0].stores = [];
            }

            // Format store data and remove null stores
            product[0].stores = product[0].stores
                .filter(store => store && store.store_id !== null)
                .map(store => ({
                    store_id: store.store_id,
                    store_name: store.store_name || '',
                    price: parseFloat(store.price) || 0,
                    stock: parseInt(store.stock) || 0,
                    rating: parseFloat(store.rating) || 0,
                    address: store.address || '',
                    phone: store.phone || '',
                    email: store.email || ''
                }));

            // Sort stores by price (low to high) initially
            product[0].stores.sort((a, b) => a.price - b.price);

            console.log('Processed store data:', {
                storeCount: product[0].stores.length,
                stores: product[0].stores.map(s => ({
                    name: s.store_name,
                    price: s.price,
                    stock: s.stock
                }))
            });

        } catch (parseError) {
            console.error('Error processing store data:', parseError);
            product[0].stores = [];
        }

        console.log('Rendering product details:', { productId, storeCount: product[0].stores.length });
        res.render('product-details', {
            title: product[0].Name,
            product: product[0],
            reviews,
            stats: stats[0],
            userCanReview,
            order,
            showLoginPrompt: !req.session.userId && product[0].stores.some(store => store.stock > 0), // Only show login prompt if product is in stock
            jsFiles: ['product-reviews']
        });

    } catch (err) {
        console.error('Error in product details route:', err);
        res.status(500).render('error', { 
            message: 'Error fetching product details',
            error: err
        });
    }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    console.log('Creating new product...');
    const { Name, Specification, Description, Category_ID, Author_ID } = req.body;
    const [result] = await pool.query(
      'INSERT INTO PRODUCT (Name, Specification, Description, Category_ID, Author_ID) VALUES (?, ?, ?, ?, ?)',
      [Name, Specification, Description, Category_ID, Author_ID]
    );

    console.log('Product created:', result.insertId);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(201).json({ 
        message: 'Product created successfully',
        productId: result.insertId 
      });
    }

    console.log('Redirecting to products page...');
    res.redirect('/products');
  } catch (error) {
    console.error('Error in product creation route:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

module.exports = router;
