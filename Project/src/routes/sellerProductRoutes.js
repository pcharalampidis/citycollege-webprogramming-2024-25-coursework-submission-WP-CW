const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const fs = require('fs');

// Middleware to check if user is logged in as seller
const isSellerLoggedIn = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userType === 'seller') {
        next();
    } else {
        res.redirect('/login');
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'src/public/uploads/products';
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Get seller's products with optional filtering
router.get('/api/seller/products', async (req, res) => {
    try {
        const { filter } = req.query;
        const sellerId = req.session.userId; // Assuming you store the seller's ID in session

        let query = `
            SELECT p.*, ps.Price, ps.Stock, c.Name_Type as Category_Name
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
            WHERE sel.Username_Id = ?
        `;

        // Add filter conditions
        if (filter === 'in-stock') {
            query += ' AND ps.Stock > 10';
        } else if (filter === 'low-stock') {
            query += ' AND ps.Stock > 0 AND ps.Stock <= 10';
        } else if (filter === 'out-of-stock') {
            query += ' AND ps.Stock = 0';
        }

        query += ' ORDER BY p.Name';

        const [products] = await db.query(query, [sellerId]);
        res.json({ products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product edit form
router.get('/edit/:productId', isSellerLoggedIn, async (req, res) => {
    try {
        const { productId } = req.params;
        const sellerId = req.session.userId;

        // Get product details
        const [products] = await db.query(`
            SELECT p.*, ps.Price, ps.Stock, c.Name_Type as Category_Name, 
                   a.Name as Author_Name, pt.Type_Name
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
            LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
            LEFT JOIN PRODUCT_TYPES pt ON p.Type_ID = pt.Type_ID
            WHERE p.Product_ID = ? AND sel.Username_Id = ?
        `, [productId, sellerId]);

        if (products.length === 0) {
            return res.status(404).render('error', { 
                message: 'Product not found or unauthorized'
            });
        }

        // Get product types
        const [types] = await db.query('SELECT * FROM PRODUCT_TYPES');
        
        // Get categories
        const [categories] = await db.query('SELECT * FROM CATEGORIES');

        res.render('seller/edit-product', {
            product: products[0],
            types,
            categories
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).render('error', { 
            message: 'Error loading edit form'
        });
    }
});

// Update product
router.put('/edit/:productId', isSellerLoggedIn, upload.single('image'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { productId } = req.params;
        const sellerId = req.session.userId;
        const {
            name, typeId, categoryId, authorName, price, stock,
            specification, description, publicationYear, isbn
        } = req.body;

        await connection.beginTransaction();

        // Verify product ownership
        const [product] = await connection.query(`
            SELECT p.Product_ID, s.Store_ID
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            WHERE p.Product_ID = ? AND sel.Username_Id = ?
        `, [productId, sellerId]);

        if (!product || product.length === 0) {
            await connection.rollback();
            return res.status(403).render('error', { 
                message: 'Unauthorized to edit this product'
            });
        }

        // Handle author
        let authorId = null;
        if (authorName) {
            const [existingAuthor] = await connection.query(
                'SELECT Author_ID FROM AUTHORS WHERE Name = ?',
                [authorName]
            );

            if (existingAuthor.length > 0) {
                authorId = existingAuthor[0].Author_ID;
            } else {
                const [newAuthor] = await connection.query(
                    'INSERT INTO AUTHORS (Name) VALUES (?)',
                    [authorName]
                );
                authorId = newAuthor.insertId;
            }
        }

        // Update product
        await connection.query(`
            UPDATE PRODUCT 
            SET Name = ?, Type_ID = ?, Category_ID = ?, Author_ID = ?,
                Specification = ?, Description = ?, Publication_Year = ?, ISBN = ?
                ${req.file ? ', Image_URL = ?' : ''}
            WHERE Product_ID = ?
        `, [
            name, typeId, categoryId, authorId,
            specification, description, publicationYear || null, isbn,
            ...(req.file ? [`/uploads/products/${req.file.filename}`] : []),
            productId
        ]);

        // Update product store
        await connection.query(`
            UPDATE PRODUCT_STORE 
            SET Price = ?, Stock = ?
            WHERE Product_ID = ? AND Store_ID = ?
        `, [price, stock, productId, product[0].Store_ID]);

        await connection.commit();
        res.redirect('/seller/dashboard');
    } catch (error) {
        await connection.rollback();
        console.error('Error updating product:', error);
        res.status(500).render('error', { 
            message: 'Error updating product'
        });
    } finally {
        connection.release();
    }
});

// Delete a product
router.delete('/delete/:productId', async (req, res) => {
    console.log('Delete request received for product:', req.params.productId);
    console.log('Session data:', req.session);
    
    const connection = await db.getConnection();
    try {
        const { productId } = req.params;
        const sellerId = req.session.userId;

        console.log('Checking authentication:', { sellerId, productId });
        if (!sellerId) {
            console.log('Not authenticated');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        await connection.beginTransaction();
        console.log('Transaction started');

        // First verify that the product listing belongs to this seller's store
        console.log('Verifying product ownership');
        const [productStore] = await connection.query(`
            SELECT ps.Product_ID, ps.Store_ID
            FROM PRODUCT_STORE ps
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            WHERE ps.Product_ID = ? AND sel.Username_Id = ?
        `, [productId, sellerId]);

        console.log('Product store verification result:', productStore);

        if (!productStore || productStore.length === 0) {
            console.log('Unauthorized: Product listing not found or does not belong to seller');
            await connection.rollback();
            return res.status(403).json({ error: 'Unauthorized to delete this product listing' });
        }

        // Delete only the product listing from PRODUCT_STORE
        console.log('Deleting product listing from PRODUCT_STORE');
        const [deleteResult] = await connection.query(
            'DELETE FROM PRODUCT_STORE WHERE Product_ID = ? AND Store_ID = ?', 
            [productId, productStore[0].Store_ID]
        );
        console.log('Product store delete result:', deleteResult);

        await connection.commit();
        console.log('Transaction committed');
        
        // Send success response
        console.log('Sending success response');
        res.json({ success: true, message: 'Product listing deleted successfully' });
    } catch (error) {
        console.error('Error in delete route:', error);
        await connection.rollback();
        console.log('Transaction rolled back');
        res.status(500).json({ error: 'Error deleting product listing: ' + error.message });
    } finally {
        connection.release();
        console.log('Connection released');
    }
});

// Handle form-based delete (fallback for non-JS)
router.post('/delete/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const sellerId = req.session.userId;

        if (!sellerId) {
            req.flash('error', 'Not authenticated');
            return res.redirect('/seller/dashboard');
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Verify product ownership
            const [product] = await connection.query(`
                SELECT p.Product_ID, p.Image_URL
                FROM PRODUCT p
                JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
                JOIN STORE s ON ps.Store_ID = s.Store_ID
                JOIN SELLER sel ON s.Store_ID = sel.Store_ID
                WHERE p.Product_ID = ? AND sel.Username_Id = ?
            `, [productId, sellerId]);

            if (!product || product.length === 0) {
                await connection.rollback();
                req.flash('error', 'Unauthorized to delete this product');
                return res.redirect('/seller/dashboard');
            }

            // Delete product associations
            await connection.query('DELETE FROM PRODUCT_STORE WHERE Product_ID = ?', [productId]);
            await connection.query('DELETE FROM USER_FAVORITES WHERE Product_ID = ?', [productId]);
            await connection.query('DELETE FROM REVIEW WHERE Product_ID = ?', [productId]);
            
            // Delete the product
            await connection.query('DELETE FROM PRODUCT WHERE Product_ID = ?', [productId]);

            // Delete image if exists
            if (product[0].Image_URL && !product[0].Image_URL.includes('default.jpg')) {
                const imagePath = path.join(__dirname, '..', 'public', product[0].Image_URL);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await connection.commit();
            req.flash('success', 'Product deleted successfully');
        } catch (error) {
            await connection.rollback();
            console.error('Error deleting product:', error);
            req.flash('error', 'Error deleting product');
        } finally {
            connection.release();
        }

        res.redirect('/seller/dashboard');
    } catch (error) {
        console.error('Error in delete route:', error);
        req.flash('error', 'Error processing delete request');
        res.redirect('/seller/dashboard');
    }
});

// Get add product form
router.get('/add', isSellerLoggedIn, async (req, res) => {
    try {
        const category = req.query.category || 'Books'; // Default to Books if no category specified
        
        // Get product types
        const [types] = await db.query('SELECT * FROM PRODUCT_TYPES');
        
        // Get categories
        const [categories] = await db.query('SELECT * FROM CATEGORIES');
        
        // Get authors for books
        const [authors] = await db.query('SELECT * FROM AUTHORS');
        
        res.render('seller/add-product', { 
            types, 
            categories, 
            authors,
            category // Pass the category to the template
        });
    } catch (error) {
        console.error('Error loading add product form:', error);
        res.status(500).render('error', { 
            message: 'Failed to load add product form',
            error: error
        });
    }
});

// Route to handle product addition
router.post('/:typeId/add', upload.single('productImage'), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const {
            productName,
            productType,
            category,
            price,
            stock,
            description,
            // Type-specific fields
            authorId,  // For books
            isbn,      // For books
            publicationYear, // For books
            brand,     // For electronics/clothing
            model,     // For electronics
            specification,
            // Clothing specific
            size,
            color,
            material
        } = req.body;

        // Basic validation
        if (!productName || !productType || !category || !price || !stock || !description) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect('/seller/products/add');
        }

        await connection.beginTransaction();

        try {
            // Get seller's store ID
            const [storeResult] = await connection.query(
                'SELECT Store_ID FROM SELLER WHERE Username_Id = ?',
                [req.session.userId]
            );

            if (!storeResult.length) {
                throw new Error('Seller store not found');
            }

            const storeId = storeResult[0].Store_ID;

            // Insert into PRODUCT table
            const [result] = await connection.query(
                `INSERT INTO PRODUCT (
                    Name, Type_ID, Category_ID, Author_ID, 
                    Specification, Description, Image_URL,
                    Brand, Model, Publication_Year, ISBN
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    productName,
                    productType,
                    category,
                    authorId || null,
                    specification || null,
                    description,
                    req.file ? `/uploads/products/${req.file.filename}` : '/images/default.jpg',
                    brand || null,
                    model || null,
                    publicationYear || null,
                    isbn || null
                ]
            );

            const productId = result.insertId;

            // Insert into PRODUCT_STORE table
            await connection.query(
                'INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock) VALUES (?, ?, ?, ?)',
                [productId, storeId, price, stock]
            );

            // If it's clothing, add to CLOTHING_DETAILS
            if (parseInt(productType) === 3 && (size || color || material)) {
                await connection.query(
                    'INSERT INTO CLOTHING_DETAILS (Product_ID, Size, Color, Material) VALUES (?, ?, ?, ?)',
                    [productId, size || null, color || null, material || null]
                );
            }

            await connection.commit();
            req.flash('success', 'Product added successfully');
            res.redirect('/seller/products');

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error adding product:', error);
        req.flash('error', 'Error adding product: ' + error.message);
        res.redirect('/seller/products/add');
    } finally {
        connection.release();
    }
});

// Get categories by type
router.get('/api/categories/:typeId', async (req, res) => {
    try {
        const { typeId } = req.params;
        const [categories] = await db.query(
            'SELECT Category_ID, Name_Type FROM CATEGORIES WHERE Type_ID = ? ORDER BY Name_Type',
            [typeId]
        );
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET API endpoint for categories
router.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT c.Category_ID, c.Name_Type, pt.Type_Name 
            FROM CATEGORIES c
            JOIN PRODUCT_TYPES pt ON c.Type_ID = pt.Type_ID
            ORDER BY pt.Type_Name, c.Name_Type
        `);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Error fetching categories' });
    }
});

module.exports = router;
