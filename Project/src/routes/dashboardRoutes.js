const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    // Get user information if logged in
    let user = null;
    if (req.session && req.session.userId) {
      const [users] = await db.query('SELECT * FROM USER WHERE Username_Id = ?', [req.session.userId]);
      user = users[0];
    }

    // Get statistics
    const [[{ booksCount }]] = await db.query('SELECT COUNT(*) as booksCount FROM PRODUCT');
    const [[{ storesCount }]] = await db.query('SELECT COUNT(*) as storesCount FROM STORE');
    const [[{ usersCount }]] = await db.query('SELECT COUNT(*) as usersCount FROM USER');

    // Get featured products (limit to 6)
    const [featuredProducts] = await db.query(`
        SELECT 
            p.*,
            CAST(MIN(ps.Price) AS DECIMAL(10,2)) as Price,
            COUNT(DISTINCT ps.Store_ID) as StoreCount
        FROM PRODUCT p
        LEFT JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
        GROUP BY p.Product_ID
        ORDER BY StoreCount DESC
        LIMIT 6
    `);

    // Format prices for display
    featuredProducts.forEach(product => {
        product.Price = product.Price ? parseFloat(product.Price) : null;
    });

    if (req.headers.accept === 'application/json') {
      return res.json({ 
        user, 
        stats: { booksCount, storesCount, usersCount },
        featuredProducts 
      });
    }

    res.render('dashboard', {
      user: user || { username: 'Guest' },
      stats: { 
        booksCount, 
        storesCount, 
        usersCount 
      },
      featuredProducts,
      title: 'Dashboard'
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ error: error.message });
    }
    res.render('error', { 
      message: 'Error loading dashboard', 
      error: error,
      title: 'Error'
    });
  }
});

// Search functionality with sorting and pagination
router.get('/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.q || '';
    const sortBy = req.query.sort || 'Name';
    const sortOrder = req.query.order || 'ASC';

    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM PRODUCT WHERE Name LIKE ? OR Description LIKE ?',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    const totalItems = countResult[0].total;

    // Get products with sorting and pagination
    const [products] = await db.query(
      `SELECT * FROM PRODUCT 
       WHERE Name LIKE ? OR Description LIKE ? 
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, limit, offset]
    );

    if (req.headers.accept === 'application/json') {
      return res.json({
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        },
        sorting: {
          sortBy,
          sortOrder
        }
      });
    }

    res.render('search', {
      products,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      searchTerm,
      sortBy,
      sortOrder
    });
  } catch (error) {
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
