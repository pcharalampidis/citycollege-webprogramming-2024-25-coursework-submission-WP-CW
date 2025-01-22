const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const sellerController = require('../controllers/sellerController');
const { isAuthenticated, isSeller } = require('../middleware/auth');

// Middleware to check if user is a seller
const isSellerMiddleware = async (req, res, next) => {
  if (!req.session.userId || !req.session.storeId || req.session.userType !== 'seller') {
    console.log('Invalid seller session:', {
      userId: req.session.userId,
      userType: req.session.userType,
      storeId: req.session.storeId
    });
    return res.redirect('/auth/seller/login');
  }
  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/products'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage: storage });

// Helper function to handle transactions
const withTransaction = async (callback) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Helper function to check product ownership
const verifyProductOwnership = async (connection, productId, storeId) => {
  const [productCheck] = await connection.query(
    'SELECT 1 FROM PRODUCT_STORE WHERE Product_ID = ? AND Store_ID = ?',
    [productId, storeId]
  );
  return productCheck.length > 0;
};

// Helper function to handle author
const handleAuthor = async (connection, authorName) => {
  if (!authorName) return null;
  
  const [existingAuthors] = await connection.query(
    'SELECT Author_ID FROM AUTHORS WHERE Name = ?',
    [authorName]
  );

  if (existingAuthors.length > 0) {
    return existingAuthors[0].Author_ID;
  }

  const [authorResult] = await connection.query(
    'INSERT INTO AUTHORS (Name) VALUES (?)',
    [authorName]
  );
  return authorResult.insertId;
};

router.use(isAuthenticated, isSeller);

// Seller Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Fetch products for the seller
        const [products] = await db.query(`
            SELECT p.*, ps.Price, ps.Stock, c.Name_Type as Category_Name
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
            WHERE sel.Username_Id = ?
            ORDER BY p.Name
        `, [req.session.userId]);

        // Get dashboard stats
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT o.Order_ID) as totalOrders,
                COALESCE(SUM(o.Total_Amount), 0) as revenue,
                COUNT(DISTINCT p.Product_ID) as products,
                COUNT(DISTINCT o.User_ID) as customers
            FROM SELLER sel
            LEFT JOIN STORE s ON sel.Store_ID = s.Store_ID
            LEFT JOIN PRODUCT_STORE ps ON s.Store_ID = ps.Store_ID
            LEFT JOIN PRODUCT p ON ps.Product_ID = p.Product_ID
            LEFT JOIN \`ORDER\` o ON p.Product_ID = o.Product_ID
            WHERE sel.Username_Id = ?
        `, [req.session.userId]);

        // Get recent orders
        const [recentOrders] = await db.query(`
            SELECT 
                o.Order_ID as id,
                CONCAT(u.First_Name, ' ', u.Last_Name) as customer,
                o.Total_Amount as amount,
                o.Status as status,
                DATE_FORMAT(o.Date, '%Y-%m-%d') as date
            FROM \`ORDER\` o
            JOIN USER u ON o.User_ID = u.Username_Id
            JOIN PRODUCT p ON o.Product_ID = p.Product_ID
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            JOIN SELLER sel ON s.Store_ID = sel.Store_ID
            WHERE sel.Username_Id = ?
            ORDER BY o.Date DESC
            LIMIT 5
        `, [req.session.userId]);

        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            cssFiles: ['seller/dashboard'],
            jsFiles: ['seller/dashboard', 'https://cdn.jsdelivr.net/npm/chart.js'],
            stats: stats[0],
            recentOrders,
            products,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        req.flash('error', 'Error loading dashboard');
        res.status(500).render('error', { 
            message: 'Error loading dashboard',
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    }
});

// Get add product page
router.get('/products/add', async (req, res) => {
  try {
    const [productTypes] = await db.query('SELECT * FROM PRODUCT_TYPES');
    const [categories] = await db.query('SELECT * FROM CATEGORIES');
    
    res.render('seller/add-product', {
      title: 'Add Product',
      cssFiles: ['seller/add-product'],
      jsFiles: ['seller/add-product'],
      types: productTypes,
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading add product page:', error);
    res.status(500).send('Error loading add product page');
  }
});

// Handle product creation
router.post('/products', upload.single('image'), async (req, res) => {
  try {
    await withTransaction(async (connection) => {
      const {
        name, typeId, authorName, specification, description,
        categoryId, publicationYear, isbn, price, stock
      } = req.body;

      const imagePath = req.file ? `/uploads/products/${req.file.filename}` : null;
      if (!imagePath) throw new Error('Image upload is required');

      const [existingProducts] = await connection.query(
        'SELECT Product_ID FROM PRODUCT WHERE Name = ?',
        [name]
      );
      if (existingProducts.length > 0) {
        throw new Error('A product with this name already exists');
      }

      const authorId = await handleAuthor(connection, authorName);

      const [productResult] = await connection.query(
        `INSERT INTO PRODUCT (
          Name, Type_ID, Author_ID, Specification, Description, 
          Category_ID, Image_URL, Publication_Year, ISBN
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, typeId, authorId, specification, description, categoryId, 
         imagePath, publicationYear || null, isbn || null]
      );

      await connection.query(
        `INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
         VALUES (?, ?, ?, ?)`,
        [productResult.insertId, req.session.storeId, parseFloat(price), parseInt(stock, 10)]
      );

      return productResult.insertId;
    });

    res.redirect('/seller/products');
  } catch (error) {
    console.error('Error in product creation:', error);
    res.status(500).send('Error creating product: ' + error.message);
  }
});

// Get categories by type
router.get('/api/categories/:typeId', async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM CATEGORIES WHERE Type_ID = ?',
      [req.params.typeId]
    );
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Products List
router.get('/products', async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, ps.Stock, pt.Name as Type_Name, pc.Name as Category_Name,
                   COALESCE(a.Name, '') as Author_Name
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            JOIN PRODUCT_TYPE pt ON p.Type_ID = pt.Type_ID
            JOIN PRODUCT_CATEGORY pc ON p.Category_ID = pc.Category_ID
            LEFT JOIN AUTHOR a ON p.Author_ID = a.Author_ID
            WHERE ps.Store_ID = ?
            ORDER BY p.Created_At DESC
        `, [req.session.storeId]);

        const [categories] = await db.query('SELECT * FROM PRODUCT_CATEGORY');

        res.render('seller/products', {
            title: 'Manage Products',
            cssFiles: ['seller/products'],
            jsFiles: ['seller/products'],
            products,
            categories,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error', 'Failed to load products');
        res.redirect('/seller/dashboard');
    }
});

// Get edit product page
router.get('/products/edit/:id', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.*,
        ps.Price,
        ps.Stock,
        a.Name as AuthorName
      FROM PRODUCT p
      JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
      LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
      WHERE p.Product_ID = ? AND ps.Store_ID = ?
    `, [req.params.id, req.session.storeId]);

    if (products.length === 0) {
      return res.status(404).render('error', { 
        error: { message: 'Product not found or not owned by your store' }
      });
    }

    const [productTypes] = await db.query('SELECT * FROM PRODUCT_TYPES');
    const [categories] = await db.query('SELECT * FROM CATEGORIES');

    res.render('seller/edit-product', {
      title: 'Edit Product',
      cssFiles: ['seller/edit-product'],
      jsFiles: ['seller/edit-product'],
      product: products[0],
      types: productTypes,
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading edit product page:', error);
    res.status(500).render('error', { error });
  }
});

// Handle product update
router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    await withTransaction(async (connection) => {
      const productId = req.params.id;
      const storeId = req.session.storeId;
      
      if (!await verifyProductOwnership(connection, productId, storeId)) {
        throw new Error('You do not have permission to edit this product');
      }

      const {
        name, typeId, authorName, specification, description,
        categoryId, publicationYear, isbn, price, stock
      } = req.body;

      const authorId = await handleAuthor(connection, authorName);

      await connection.query(`
        UPDATE PRODUCT 
        SET 
          Name = ?, Type_ID = ?, Author_ID = ?, Specification = ?,
          Description = ?, Category_ID = ?, Publication_Year = ?,
          ISBN = ?, Image_URL = COALESCE(?, Image_URL)
        WHERE Product_ID = ?
      `, [
        name, typeId, authorId, specification, description,
        categoryId, publicationYear || null, isbn || null,
        req.file ? '/uploads/products/' + req.file.filename : null,
        productId
      ]);

      await connection.query(`
        UPDATE PRODUCT_STORE 
        SET Price = ?, Stock = ?
        WHERE Product_ID = ? AND Store_ID = ?
      `, [price, stock, productId, storeId]);
    });

    res.redirect('/seller/products');
  } catch (error) {
    console.error('Error updating product:', error);
    res.redirect('/seller/products?error=update_failed');
  }
});

// Orders List
router.get('/orders', async (req, res) => {
    try {
        // Fetch orders from database
        const [orders] = await db.query(`
            SELECT o.*, c.First_Name, c.Last_Name
            FROM \`ORDER\` o
            JOIN CUSTOMER c ON o.Customer_ID = c.Customer_ID
            JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
            JOIN PRODUCT_STORE ps ON oi.Product_ID = ps.Product_ID
            WHERE ps.Store_ID = ?
            GROUP BY o.Order_ID
            ORDER BY o.Created_At DESC
        `, [req.session.storeId]);

        const formattedOrders = orders.map(order => ({
            id: order.Order_ID,
            customer: `${order.First_Name} ${order.Last_Name}`,
            amount: order.Total_Amount,
            status: order.Status,
            date: new Date(order.Created_At).toLocaleDateString()
        }));

        res.render('seller/orders', {
            title: 'Manage Orders',
            cssFiles: ['seller/orders'],
            jsFiles: ['seller/orders', 'https://cdn.jsdelivr.net/npm/flatpickr'],
            orders: formattedOrders,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(orders.length / 10)
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/seller/dashboard');
    }
});

// Delete product
router.post('/products/delete/:id', sellerController.deleteProduct);

module.exports = router;
