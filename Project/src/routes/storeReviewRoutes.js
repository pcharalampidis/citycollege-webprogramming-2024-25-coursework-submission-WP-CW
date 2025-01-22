const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Please login to write a review' });
    }
};

// Get reviews for a store
router.get('/store/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        
        // Get reviews with user names
        const [reviews] = await db.query(`
            SELECT sr.*, u.First_Name, u.Last_Name 
            FROM STORE_REVIEW sr
            JOIN USER u ON sr.User_ID = u.Username_Id
            WHERE sr.Store_ID = ?
            ORDER BY sr.Date DESC
        `, [storeId]);

        // Calculate average rating
        const [avgRating] = await db.query(`
            SELECT 
                AVG(Rating) as average_rating, 
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN Rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN Rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN Rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN Rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN Rating = 1 THEN 1 END) as one_star
            FROM STORE_REVIEW
            WHERE Store_ID = ?
        `, [storeId]);

        res.json({
            reviews,
            stats: {
                averageRating: avgRating[0].average_rating || 0,
                totalReviews: avgRating[0].total_reviews || 0,
                ratingDistribution: {
                    5: avgRating[0].five_star || 0,
                    4: avgRating[0].four_star || 0,
                    3: avgRating[0].three_star || 0,
                    2: avgRating[0].two_star || 0,
                    1: avgRating[0].one_star || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching store reviews:', error);
        res.status(500).json({ error: 'Failed to fetch store reviews' });
    }
});

// Add a new store review
router.post('/', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { storeId, orderId, rating, comments } = req.body;
        const userId = req.session.userId;

        // Check if user has already reviewed this store
        const [existingReview] = await connection.query(
            'SELECT * FROM STORE_REVIEW WHERE User_ID = ? AND Store_ID = ?',
            [userId, storeId]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({ error: 'You have already reviewed this store' });
        }

        // Verify that user has purchased from this store
        const [order] = await connection.query(
            'SELECT * FROM `ORDER` WHERE Order_ID = ? AND User_ID = ? AND Store_ID = ? AND Status = "delivered"',
            [orderId, userId, storeId]
        );

        if (order.length === 0) {
            return res.status(400).json({ error: 'You can only review stores you have purchased from' });
        }

        // Add the review
        await connection.query(
            'INSERT INTO STORE_REVIEW (User_ID, Store_ID, Order_ID, Rating, Comments) VALUES (?, ?, ?, ?, ?)',
            [userId, storeId, orderId, rating, comments]
        );

        // Update store's average rating
        const [avgRating] = await connection.query(
            'SELECT AVG(Rating) as avg_rating FROM STORE_REVIEW WHERE Store_ID = ?',
            [storeId]
        );

        await connection.query(
            'UPDATE STORE SET Rating = ? WHERE Store_ID = ?',
            [avgRating[0].avg_rating, storeId]
        );

        await connection.commit();
        res.json({ message: 'Store review added successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding store review:', error);
        res.status(500).json({ error: 'Failed to add store review' });
    } finally {
        connection.release();
    }
});

// Update a store review
router.put('/:reviewId', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reviewId } = req.params;
        const { rating, comments } = req.body;
        const userId = req.session.userId;

        // Check if review belongs to user
        const [review] = await connection.query(
            'SELECT * FROM STORE_REVIEW WHERE Review_ID = ? AND User_ID = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(403).json({ error: 'Not authorized to update this review' });
        }

        // Update the review
        await connection.query(
            'UPDATE STORE_REVIEW SET Rating = ?, Comments = ? WHERE Review_ID = ?',
            [rating, comments, reviewId]
        );

        // Update store's average rating
        const storeId = review[0].Store_ID;
        const [avgRating] = await connection.query(
            'SELECT AVG(Rating) as avg_rating FROM STORE_REVIEW WHERE Store_ID = ?',
            [storeId]
        );

        await connection.query(
            'UPDATE STORE SET Rating = ? WHERE Store_ID = ?',
            [avgRating[0].avg_rating, storeId]
        );

        await connection.commit();
        res.json({ message: 'Store review updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating store review:', error);
        res.status(500).json({ error: 'Failed to update store review' });
    } finally {
        connection.release();
    }
});

// Delete a store review
router.delete('/:reviewId', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reviewId } = req.params;
        const userId = req.session.userId;

        // Check if review belongs to user
        const [review] = await connection.query(
            'SELECT * FROM STORE_REVIEW WHERE Review_ID = ? AND User_ID = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(403).json({ error: 'Not authorized to delete this review' });
        }

        // Store the store ID before deleting the review
        const storeId = review[0].Store_ID;

        // Delete the review
        await connection.query('DELETE FROM STORE_REVIEW WHERE Review_ID = ?', [reviewId]);

        // Update store's average rating
        const [avgRating] = await connection.query(
            'SELECT AVG(Rating) as avg_rating FROM STORE_REVIEW WHERE Store_ID = ?',
            [storeId]
        );

        await connection.query(
            'UPDATE STORE SET Rating = ? WHERE Store_ID = ?',
            [avgRating[0].avg_rating || 0, storeId]
        );

        await connection.commit();
        res.json({ message: 'Store review deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting store review:', error);
        res.status(500).json({ error: 'Failed to delete store review' });
    } finally {
        connection.release();
    }
});

module.exports = router;
