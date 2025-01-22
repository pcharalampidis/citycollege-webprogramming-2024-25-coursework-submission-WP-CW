const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all product reviews
router.get('/products', async (req, res) => {
  try {
    const [reviews] = await db.query(`
      SELECT pr.*, u.First_Name, u.Last_Name, p.Name as Product_Name
      FROM PRODUCT_REVIEW pr
      JOIN USER u ON pr.User_ID = u.Username_Id
      JOIN PRODUCT p ON pr.Product_ID = p.Product_ID
      ORDER BY pr.Date DESC
    `);
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all store reviews
router.get('/stores', async (req, res) => {
  try {
    const [reviews] = await db.query(`
      SELECT sr.*, u.First_Name, u.Last_Name, s.Name as Store_Name
      FROM STORE_REVIEW sr
      JOIN USER u ON sr.User_ID = u.Username_Id
      JOIN STORE s ON sr.Store_ID = s.Store_ID
      ORDER BY sr.Date DESC
    `);
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching store reviews:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get product review by ID
router.get('/products/:id', async (req, res) => {
  try {
    const [review] = await db.query(`
      SELECT pr.*, u.First_Name, u.Last_Name, p.Name as Product_Name
      FROM PRODUCT_REVIEW pr
      JOIN USER u ON pr.User_ID = u.Username_Id
      JOIN PRODUCT p ON pr.Product_ID = p.Product_ID
      WHERE pr.Review_ID = ?
    `, [req.params.id]);
    
    if (review.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review[0]);
  } catch (error) {
    console.error('Error fetching product review:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get store review by ID
router.get('/stores/:id', async (req, res) => {
  try {
    const [review] = await db.query(`
      SELECT sr.*, u.First_Name, u.Last_Name, s.Name as Store_Name
      FROM STORE_REVIEW sr
      JOIN USER u ON sr.User_ID = u.Username_Id
      JOIN STORE s ON sr.Store_ID = s.Store_ID
      WHERE sr.Review_ID = ?
    `, [req.params.id]);
    
    if (review.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review[0]);
  } catch (error) {
    console.error('Error fetching store review:', error);
    res.status(500).json({ message: error.message });
  }
});

// Submit a product review
router.post('/product-reviews', async (req, res) => {
  try {
    const { productId, orderId, rating, comments } = req.body;
    const userId = req.session.user.Username_Id; // Get user ID from session

    // Verify that the user has purchased this product
    const [orders] = await db.query(
      'SELECT * FROM `ORDER` WHERE User_ID = ? AND Product_ID = ? AND Order_ID = ? AND Status = "delivered"',
      [userId, productId, orderId]
    );

    if (orders.length === 0) {
      return res.status(403).json({ message: 'You can only review products you have purchased' });
    }

    // Check if user has already reviewed this product
    const [existingReview] = await db.query(
      'SELECT * FROM PRODUCT_REVIEW WHERE User_ID = ? AND Product_ID = ? AND Order_ID = ?',
      [userId, productId, orderId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Insert the review
    const [result] = await db.query(
      'INSERT INTO PRODUCT_REVIEW (User_ID, Product_ID, Order_ID, Rating, Comments) VALUES (?, ?, ?, ?, ?)',
      [userId, productId, orderId, rating, comments]
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.insertId
    });
  } catch (error) {
    console.error('Error submitting product review:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
