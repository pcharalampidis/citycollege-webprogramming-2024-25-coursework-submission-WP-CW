const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// View customer's own orders
router.get('/', auth.isAuthenticated, async (req, res) => {
    const connection = await db.getConnection();
    try {
        // Get all orders for the user
        const [orders] = await connection.query(
            `SELECT o.*, 
                    p.Name as ProductName, 
                    p.Image_URL,
                    s.Name as StoreName,
                    s.Store_ID
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             WHERE o.User_ID = ?
             ORDER BY o.Date DESC`,
            [req.user.Username_Id]
        );
        
        // Format the orders for display
        const formattedOrders = orders.map(order => ({
            ...order,
            Date: new Date(order.Date).toLocaleString(),
            Status: order.Status.charAt(0).toUpperCase() + order.Status.slice(1),
            Total_Amount: parseFloat(order.Total_Amount)
        }));
        
        console.log('Fetched orders:', formattedOrders);
        
        res.render('orders/my-orders', { 
            orders: formattedOrders,
            title: 'My Orders',
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

// Place new order
router.post('/cart/place-order', auth.isAuthenticated, auth.isCustomer, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const { items, shipping } = req.body;
        const userId = req.session.userId;
        
        // Add detailed logging
        console.log('Order request details:', {
            userId,
            items,
            shipping,
            timestamp: new Date().toISOString()
        });

        // Process each item in the order
        const orderPromises = items.map(async (item) => {
            // Get product price from the specific store
            const [priceResult] = await connection.query(
                'SELECT Price FROM PRODUCT_STORE WHERE Product_ID = ? AND Store_ID = ?',
                [item.id, item.store_id]
            );
            
            if (!priceResult.length) {
                throw new Error(`Product ${item.id} not available in store ${item.store_id}`);
            }
            
            // Check stock availability
            const [stockResult] = await connection.query(
                'SELECT Stock FROM PRODUCT_STORE WHERE Product_ID = ? AND Store_ID = ? AND Stock >= ?',
                [item.id, item.store_id, item.quantity]
            );
            
            if (!stockResult.length) {
                throw new Error(`Insufficient stock for product ${item.id}`);
            }
            
            // Format shipping address
            const shippingAddress = `${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}`;
            
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
                    item.price,
                    item.price * item.quantity,
                    shippingAddress,
                ]
            );
            
            // Update stock
            await connection.query(
                'UPDATE PRODUCT_STORE SET Stock = Stock - ? WHERE Product_ID = ? AND Store_ID = ?',
                [item.quantity, item.id, item.store_id]
            );
            
            return result.insertId;
        });
        
        // Wait for all orders to be processed
        const orderIds = await Promise.all(orderPromises);
        
        await connection.commit();
        
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

// View details of a specific order
router.get('/:orderId', auth.isAuthenticated, auth.isCustomer, async (req, res) => {
    const connection = await db.getConnection();
    try {
        // Get the order details including product and store information
        const [orders] = await connection.query(
            `SELECT o.*, 
                    p.Name as ProductName, 
                    p.Image_URL,
                    s.Name as StoreName,
                    s.Store_ID
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             WHERE o.Order_ID = ? AND o.User_ID = ?`,
            [req.params.orderId, req.user.Username_Id]
        );

        if (orders.length === 0) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Order not found',
                error: { status: 404 }
            });
        }

        // Format the order data
        const order = {
            ...orders[0],
            Date: new Date(orders[0].Date).toLocaleString(),
            Status: orders[0].Status.charAt(0).toUpperCase() + orders[0].Status.slice(1),
            Total_Amount: parseFloat(orders[0].Total_Amount),
            Price: parseFloat(orders[0].Price)
        };

        res.render('orders/order-details', {
            title: `Order #${order.Order_ID} Details`,
            order: order,
            user: req.user
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch order details',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

// Cancel order (if it's still pending)
router.post('/orders/:id/cancel', auth.isAuthenticated, auth.isCustomer, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [order] = await connection.query(
            'SELECT o.*, ps.Store_ID FROM \`ORDER\` o LEFT JOIN PRODUCT_STORE ps ON o.Product_ID = ps.Product_ID WHERE o.Order_ID = ? AND o.User_ID = ?',
            [req.params.id, req.session.userId]
        );
        
        if (!order.length) {
            throw new Error('Order not found');
        }
        
        if (order[0].Status !== 'pending') {
            throw new Error('Only pending orders can be cancelled');
        }
        
        // Update order status
        await connection.query(
            'UPDATE \`ORDER\` SET Status = "cancelled" WHERE Order_ID = ?',
            [req.params.id]
        );
        
        // Restore stock
        await connection.query(
            'UPDATE PRODUCT_STORE SET Stock = Stock + ? WHERE Product_ID = ? AND Store_ID = ?',
            [order[0].Quantity, order[0].Product_ID, order[0].Store_ID]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Order cancellation error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
