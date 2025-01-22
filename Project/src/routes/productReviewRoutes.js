const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Please login to write a review' });
    }
};

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Get reviews with user names
        const [reviews] = await db.query(`
            SELECT pr.*, u.First_Name, u.Last_Name 
            FROM PRODUCT_REVIEW pr
            JOIN USER u ON pr.User_ID = u.Username_Id
            WHERE pr.Product_ID = ?
            ORDER BY pr.Date DESC
        `, [productId]);

        // Calculate average rating
        const [avgRating] = await db.query(`
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
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Submit a product review
router.post('/', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { productId, orderId, rating, comments } = req.body;
        const userId = req.session.userId;

        // Start transaction
        await connection.beginTransaction();

        // Verify that the user has purchased this product
        const [orders] = await connection.query(
            'SELECT * FROM `ORDER` WHERE User_ID = ? AND Product_ID = ? AND Order_ID = ? AND Status = "delivered"',
            [userId, productId, orderId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'You can only review products you have purchased' });
        }

        // Check if user has already reviewed this product
        const [existingReview] = await connection.query(
            'SELECT * FROM PRODUCT_REVIEW WHERE User_ID = ? AND Product_ID = ? AND Order_ID = ?',
            [userId, productId, orderId]
        );

        if (existingReview.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Insert the review
        await connection.query(
            'INSERT INTO PRODUCT_REVIEW (User_ID, Product_ID, Order_ID, Rating, Comments, Date) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, productId, orderId, rating, comments]
        );

        // Commit transaction
        await connection.commit();

        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting review:', error);
        res.status(500).json({ message: 'Failed to submit review' });
    } finally {
        connection.release();
    }
});

// Update a review
router.put('/:reviewId', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reviewId } = req.params;
        const { rating, comments } = req.body;
        const userId = req.session.userId;

        // Check if review belongs to user
        const [review] = await connection.query(
            'SELECT * FROM PRODUCT_REVIEW WHERE Review_ID = ? AND User_ID = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(403).json({ error: 'Not authorized to update this review' });
        }

        // Update the review
        await connection.query(
            'UPDATE PRODUCT_REVIEW SET Rating = ?, Comments = ? WHERE Review_ID = ?',
            [rating, comments, reviewId]
        );

        await connection.commit();
        res.json({ message: 'Review updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Failed to update review' });
    } finally {
        connection.release();
    }
});

// Delete a review
router.delete('/:reviewId', isLoggedIn, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { reviewId } = req.params;
        const userId = req.session.userId;

        // Check if review belongs to user
        const [review] = await connection.query(
            'SELECT * FROM PRODUCT_REVIEW WHERE Review_ID = ? AND User_ID = ?',
            [reviewId, userId]
        );

        if (review.length === 0) {
            return res.status(403).json({ error: 'Not authorized to delete this review' });
        }

        // Delete the review
        await connection.query('DELETE FROM PRODUCT_REVIEW WHERE Review_ID = ?', [reviewId]);

        await connection.commit();
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    } finally {
        connection.release();
    }
});

module.exports = router;
