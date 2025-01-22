const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all stores
router.get('/', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM STORE');
    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get store details
router.get('/:id', async (req, res) => {
    try {
        const storeId = req.params.id;
        const userId = req.session.userId;

        // Get store details
        const [store] = await db.query(`
            SELECT * FROM STORE WHERE Store_ID = ?
        `, [storeId]);

        if (store.length === 0) {
            return res.status(404).render('error', { message: 'Store not found' });
        }

        // Check if user has ordered from this store
        let hasOrdered = false;
        if (userId) {
            const [orders] = await db.query(`
                SELECT * FROM \`ORDER\` 
                WHERE User_ID = ? AND Store_ID = ? AND Status = 'delivered'
                LIMIT 1
            `, [userId, storeId]);
            hasOrdered = orders.length > 0;
        }

        // Get review statistics
        const [stats] = await db.query(`
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

        // Get reviews
        const [reviews] = await db.query(`
            SELECT sr.*, u.First_Name, u.Last_Name 
            FROM STORE_REVIEW sr
            JOIN USER u ON sr.User_ID = u.Username_Id
            WHERE sr.Store_ID = ?
            ORDER BY sr.Date DESC
        `, [storeId]);

        // Get store's products
        const [products] = await db.query(`
            SELECT p.*, ps.Price, ps.Stock
            FROM PRODUCT p
            JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
            WHERE ps.Store_ID = ?
        `, [storeId]);

        res.render('store-details', {
            store: store[0],
            products,
            hasOrdered,
            stats: {
                averageRating: stats[0].average_rating || 0,
                totalReviews: stats[0].total_reviews || 0,
                ratingDistribution: {
                    5: stats[0].five_star || 0,
                    4: stats[0].four_star || 0,
                    3: stats[0].three_star || 0,
                    2: stats[0].two_star || 0,
                    1: stats[0].one_star || 0
                }
            },
            reviews,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching store details:', error);
        res.status(500).render('error', { message: 'Error fetching store details' });
    }
});

module.exports = router;
