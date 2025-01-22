const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session?.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Get all orders
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM `ORDER`');
    const totalItems = countResult[0].total;

    // Get orders with pagination and join with related tables
    const [orders] = await db.query(
      `SELECT o.*, 
              p.Name as ProductName, 
              u.First_Name, u.Last_Name,
              s.Name as StoreName
       FROM \`ORDER\` o
       LEFT JOIN PRODUCT p ON o.Product_ID = p.Product_ID
       LEFT JOIN USER u ON o.User_ID = u.Username_Id
       LEFT JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
       LEFT JOIN STORE s ON ps.Store_ID = s.Store_ID
       ORDER BY o.Date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    if (req.headers.accept === 'application/json') {
      return res.json({
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        }
      });
    }

    res.render('orders', {
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const [order] = await db.query(
      `SELECT o.*, 
              p.Name as ProductName,
              p.Description as ProductDescription,
              u.First_Name, u.Last_Name,
              s.Name as StoreName,
              s.Contact_Info as StoreContact
       FROM \`ORDER\` o
       LEFT JOIN PRODUCT p ON o.Product_ID = p.Product_ID
       LEFT JOIN USER u ON o.User_ID = u.Username_Id
       LEFT JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
       LEFT JOIN STORE s ON ps.Store_ID = s.Store_ID
       WHERE o.Order_ID = ?`,
      [req.params.id]
    );

    if (order.length === 0) {
      if (req.headers.accept === 'application/json') {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.render('error', { error: 'Order not found' });
    }

    if (req.headers.accept === 'application/json') {
      return res.json(order[0]);
    }

    res.render('orders/order-details', { order: order[0] });
  } catch (error) {
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const { Product_ID, Quantity } = req.body;
    const User_ID = req.session.userId;
    const Status = 'Pending';
    const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.query(
      'INSERT INTO `ORDER` (User_ID, Product_ID, Quantity, Status, Date) VALUES (?, ?, ?, ?, ?)',
      [User_ID, Product_ID, Quantity, Status, orderDate]
    );

    if (req.headers['content-type'] === 'application/json') {
      return res.status(201).json({
        message: 'Order created successfully',
        orderId: result.insertId
      });
    }

    res.redirect('/orders');
  } catch (error) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

// Update order status
router.put('/:id', async (req, res) => {
  try {
    const { Status } = req.body;
    await db.query(
      'UPDATE `ORDER` SET Status = ? WHERE Order_ID = ?',
      [Status, req.params.id]
    );

    if (req.headers.accept === 'application/json') {
      return res.json({ message: 'Order updated successfully' });
    }

    res.redirect(`/orders/${req.params.id}`);
  } catch (error) {
    if (req.headers.accept === 'application/json') {
      return res.status(500).json({ message: error.message });
    }
    res.render('error', { error });
  }
});

module.exports = router;
