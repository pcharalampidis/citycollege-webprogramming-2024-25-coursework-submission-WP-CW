const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');

// View cart page
router.get('/', isAuthenticated, (req, res) => {
    try {
        res.render('cart/index', {
            title: 'Shopping Cart',
            user: req.user,
            cssFiles: ['cart'],
            jsFiles: ['cart', 'cart-page']
        });
    } catch (error) {
        console.error('Error rendering cart page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load cart page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Get user's cart items
router.get('/items', isAuthenticated, async (req, res) => {
    const connection = await db.getConnection();
    try {
        // Get cart items with their selected store
        const [cartItems] = await connection.query(`
            SELECT 
                c.*,
                p.Name as name,
                p.Image_URL as image_url,
                ps.Price as price,
                ps.Stock as stock,
                c.store_id,
                s.Name as store_name,
                p.Product_ID
            FROM CART c
            JOIN PRODUCT p ON c.product_id = p.Product_ID
            JOIN PRODUCT_STORE ps ON c.product_id = ps.Product_ID AND c.store_id = ps.Store_ID
            JOIN STORE s ON c.store_id = s.Store_ID
            WHERE c.user_id = ?
        `, [req.user.Username_Id]);

        // Add stock information to response
        const itemsWithStock = cartItems.map(item => ({
            ...item,
            inStock: item.stock >= item.quantity,
            availableStock: item.stock,
            Product_ID: item.Product_ID || item.product_id,  // Ensure consistent casing
            Store_ID: item.store_id  // Map to uppercase for ORDER table
        }));

        res.json(itemsWithStock);
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ error: 'Failed to fetch cart items' });
    } finally {
        connection.release();
    }
});

// Add item to cart
router.post('/items', isAuthenticated, async (req, res) => {
    const { productId, storeId, quantity } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Check if item already exists in cart
        const [existing] = await connection.query(
            'SELECT * FROM CART WHERE user_id = ? AND product_id = ?',
            [req.user.Username_Id, productId]
        );

        if (existing.length > 0) {
            // Update quantity
            await connection.query(
                'UPDATE CART SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, req.user.Username_Id, productId]
            );
        } else {
            // Insert new item
            await connection.query(
                'INSERT INTO CART (user_id, product_id, store_id, quantity) VALUES (?, ?, ?, ?)',
                [req.user.Username_Id, productId, storeId, quantity]
            );
        }

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    } finally {
        connection.release();
    }
});

// Update cart item quantity
router.put('/items/:productId', isAuthenticated, async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const connection = await db.getConnection();
    
    try {
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        await connection.beginTransaction();

        // Check if product exists and get its details
        const [products] = await connection.query(
            'SELECT * FROM PRODUCT WHERE Product_ID = ?',
            [productId]
        );

        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if item exists in cart
        const [cartItems] = await connection.query(
            'SELECT * FROM CART WHERE user_id = ? AND product_id = ?',
            [req.user.Username_Id, productId]
        );

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cart item not found' });
        }

        // Update quantity
        const [result] = await connection.query(
            'UPDATE CART SET quantity = ? WHERE user_id = ? AND product_id = ?',
            [quantity, req.user.Username_Id, productId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cart item not found' });
        }

        await connection.commit();

        // Return updated cart item
        const [updatedItems] = await connection.query(`
            SELECT 
                c.*,
                p.Name as name,
                p.Image_URL as image_url,
                ps.Price as price,
                s.Store_ID as store_id,
                s.Name as store_name,
                p.Product_ID as product_id
            FROM CART c
            JOIN PRODUCT p ON c.product_id = p.Product_ID
            JOIN (
                SELECT ps1.*
                FROM PRODUCT_STORE ps1
                LEFT JOIN PRODUCT_STORE ps2 
                    ON ps1.Product_ID = ps2.Product_ID 
                    AND ps1.Price > ps2.Price
                WHERE ps2.Product_ID IS NULL
            ) ps ON p.Product_ID = ps.Product_ID
            JOIN STORE s ON ps.Store_ID = s.Store_ID
            WHERE c.user_id = ? AND c.product_id = ?
        `, [req.user.Username_Id, productId]);

        res.json(updatedItems[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    } finally {
        connection.release();
    }
});

// Remove item from cart
router.delete('/items/:productId', isAuthenticated, async (req, res) => {
    const { productId } = req.params;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'DELETE FROM CART WHERE user_id = ? AND product_id = ?',
            [req.user.Username_Id, productId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Cart item not found' });
        }

        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Error removing cart item:', error);
        res.status(500).json({ error: 'Failed to remove cart item' });
    } finally {
        connection.release();
    }
});

// Clear cart
router.delete('/items', isAuthenticated, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM CART WHERE user_id = ?', [req.user.Username_Id]);
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    } finally {
        connection.release();
    }
});

// Checkout page
router.get('/checkout', isAuthenticated, (req, res) => {
    try {
        res.render('cart/checkout', {
            title: 'Checkout',
            user: req.user,
            cssFiles: ['cart', 'checkout'],
            jsFiles: ['cart', 'checkout']
        });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load checkout page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Place order
router.post('/place-order', isAuthenticated, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { items, shipping } = req.body;
        const userId = req.user.Username_Id;
        
        // Add detailed logging
        console.log('Order request details:', {
            userId,
            items,
            shipping,
            timestamp: new Date().toISOString()
        });

        // Process each item in the order
        const orderPromises = items.map(async (item) => {
            // Get product price and check stock
            const [productStore] = await connection.query(
                'SELECT Price, Stock FROM PRODUCT_STORE WHERE Product_ID = ? AND Store_ID = ?',
                [item.id, item.store_id]
            );
            
            if (!productStore.length) {
                throw new Error(`Product ${item.id} not available in store ${item.store_id}`);
            }
            
            if (productStore[0].Stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${item.id}`);
            }
            
            // Format shipping address
            const shippingAddress = `${shipping.firstName} ${shipping.lastName}, ${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}`;
            
            // Create order
            const [result] = await connection.query(
                `INSERT INTO \`ORDER\` (
                    User_ID,
                    Product_ID,
                    Store_ID,
                    Quantity,
                    Price,
                    Total_Amount,
                    Shipping_Address,
                    Status,
                    Date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                [
                    userId,
                    item.id,
                    item.store_id,
                    item.quantity,
                    productStore[0].Price,
                    productStore[0].Price * item.quantity,
                    shippingAddress
                ]
            );
            
            // Update stock
            await connection.query(
                'UPDATE PRODUCT_STORE SET Stock = Stock - ? WHERE Product_ID = ? AND Store_ID = ?',
                [item.quantity, item.id, item.store_id]
            );

            // Clear cart item
            await connection.query(
                'DELETE FROM CART WHERE user_id = ? AND product_id = ? AND store_id = ?',
                [userId, item.id, item.store_id]
            );
            
            return result.insertId;
        });
        
        // Wait for all orders to be processed
        const orderIds = await Promise.all(orderPromises);
        
        await connection.commit();
        
        console.log('Orders created successfully:', orderIds);
        
        res.json({ 
            success: true, 
            orderIds,
            message: 'Orders placed successfully' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Order placement error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to place order' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
