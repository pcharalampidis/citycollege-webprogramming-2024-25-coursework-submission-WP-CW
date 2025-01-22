const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /seller/settings
router.get('/', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const sellerId = req.session.userId;

        // Get seller and store information
        const [storeInfo] = await connection.query(`
            SELECT s.*, st.*
            FROM SELLER s
            JOIN STORE st ON s.Store_ID = st.Store_ID
            WHERE s.Username_Id = ?
        `, [sellerId]);

        connection.release();

        res.render('seller/settings', {
            title: 'Store Settings',
            store: storeInfo[0],
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error fetching seller settings:', error);
        req.flash('error', 'Failed to load settings');
        res.redirect('/seller/dashboard');
    }
});

// POST /seller/settings/update
router.post('/update', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const sellerId = req.session.userId;
        const { shopName, description, phone, email, address } = req.body;

        await connection.beginTransaction();

        // Update store information
        await connection.query(`
            UPDATE STORE st
            JOIN SELLER s ON s.Store_ID = st.Store_ID
            SET 
                st.Shop_Name = ?,
                st.Description = ?,
                st.Business_Phone = ?,
                st.Email = ?,
                st.Business_Address = ?
            WHERE s.Username_Id = ?
        `, [shopName, description, phone, email, address, sellerId]);

        await connection.commit();
        connection.release();

        req.flash('success', 'Store settings updated successfully');
        res.redirect('/seller/settings');
    } catch (error) {
        console.error('Error updating seller settings:', error);
        req.flash('error', 'Failed to update settings');
        res.redirect('/seller/settings');
    }
});

module.exports = router;
