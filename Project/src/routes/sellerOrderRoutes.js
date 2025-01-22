const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// View all orders for seller's store
router.get('/', auth.isAuthenticated, auth.isSeller, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        console.log('Fetching orders for seller:', {
            userId: req.session.userId,
            storeId: req.session.storeId,
            userType: req.session.userType
        });

        // Get total count for pagination
        const [countResult] = await connection.query(
            `SELECT COUNT(DISTINCT o.Order_ID) as total 
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             JOIN SELLER sel ON s.Store_ID = sel.Store_ID
             JOIN PRODUCT_STORE ps ON (o.Product_ID = ps.Product_ID AND o.Store_ID = ps.Store_ID)
             WHERE sel.Username_Id = ?`,
            [req.session.userId]
        );
        
        const totalItems = countResult[0].total;
        console.log('Total orders found:', totalItems);

        // Get orders with pagination
        const [orders] = await connection.query(
            `SELECT o.*, 
                    p.Name as ProductName,
                    p.Image_URL,
                    ps.Price,
                    o.Quantity * ps.Price as TotalPrice,
                    u.First_Name, u.Last_Name,
                    u.Email,
                    s.Name as StoreName
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             JOIN SELLER sel ON s.Store_ID = sel.Store_ID
             JOIN USER u ON o.User_ID = u.Username_Id
             JOIN PRODUCT_STORE ps ON (o.Product_ID = ps.Product_ID AND o.Store_ID = ps.Store_ID)
             WHERE sel.Username_Id = ?
             ORDER BY o.Date DESC
             LIMIT ? OFFSET ?`,
            [req.session.userId, limit, offset]
        );

        console.log('Orders found:', orders.length);
        
        // Format the orders
        const formattedOrders = orders.map(order => ({
            ...order,
            Date: new Date(order.Date).toLocaleString(),
            Status: order.Status.charAt(0).toUpperCase() + order.Status.slice(1),
            TotalPrice: parseFloat(order.TotalPrice || 0)
        }));
        
        console.log('Formatted orders:', formattedOrders.length);
        
        res.render('seller/orders', { 
            orders: formattedOrders,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            title: 'Seller Orders'
        });
    } catch (error) {
        console.error('Error in seller orders route:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load orders',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

// Update order status
router.put('/:id/status', auth.isAuthenticated, auth.isSeller, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        
        // Verify seller owns this order
        const [orderCheck] = await connection.query(
            `SELECT o.* FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             JOIN SELLER sel ON s.Store_ID = sel.Store_ID
             WHERE sel.Username_Id = ? AND o.Order_ID = ?`,
            [req.session.userId, orderId]
        );

        if (!orderCheck.length) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }
        
        await connection.query(
            'UPDATE \`ORDER\` SET Status = ? WHERE Order_ID = ?',
            [status, orderId]
        );
        
        // If order is cancelled, restore product stock
        if (status === 'Cancelled') {
            await connection.query(
                `UPDATE PRODUCT p
                 JOIN \`ORDER\` o ON p.Product_ID = o.Product_ID
                 SET p.Stock = p.Stock + o.Quantity
                 WHERE o.Order_ID = ?`,
                [orderId]
            );
        }
        
        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Error in updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

// View specific order details
router.get('/:id', auth.isAuthenticated, auth.isSeller, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const orderId = req.params.id;
        console.log('Fetching details for order:', orderId);

        const [orders] = await connection.query(
            `SELECT o.*, 
                    p.Name as ProductName,
                    p.Description as ProductDescription,
                    p.Image_URL,
                    ps.Price,
                    o.Quantity * ps.Price as TotalPrice,
                    u.First_Name, u.Last_Name,
                    u.Email,
                    s.Name as StoreName
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             JOIN SELLER sel ON s.Store_ID = sel.Store_ID
             JOIN USER u ON o.User_ID = u.Username_Id
             JOIN PRODUCT_STORE ps ON (o.Product_ID = ps.Product_ID AND o.Store_ID = ps.Store_ID)
             WHERE sel.Username_Id = ? AND o.Order_ID = ?`,
            [req.session.userId, orderId]
        );

        if (orders.length === 0) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Order not found',
                error: { status: 404, stack: '' }
            });
        }

        const order = {
            ...orders[0],
            Date: new Date(orders[0].Date).toLocaleString(),
            Status: orders[0].Status.charAt(0).toUpperCase() + orders[0].Status.slice(1),
            Price: parseFloat(orders[0].Price || 0),
            TotalPrice: parseFloat(orders[0].TotalPrice || 0)
        };

        res.render('seller/sellerorder-details', { 
            order,
            title: `Order #${orderId} Details`,
            cssFiles: ['sellerorder-details'],
            jsFiles: ['sellerorder-details']
        });
    } catch (error) {
        console.error('Error in getting order details:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load order details',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

// Get order statistics
router.get('/stats', auth.isAuthenticated, auth.isSeller, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const [stats] = await connection.query(
            `SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) as pendingOrders,
                SUM(CASE WHEN Status = 'Processing' THEN 1 ELSE 0 END) as processingOrders,
                SUM(CASE WHEN Status = 'Shipped' THEN 1 ELSE 0 END) as shippedOrders,
                SUM(CASE WHEN Status = 'Delivered' THEN 1 ELSE 0 END) as deliveredOrders,
                SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
                SUM(o.Quantity * p.Price) as totalRevenue
             FROM \`ORDER\` o
             JOIN PRODUCT p ON o.Product_ID = p.Product_ID
             JOIN STORE s ON o.Store_ID = s.Store_ID
             JOIN SELLER sel ON s.Store_ID = sel.Store_ID
             WHERE sel.Username_Id = ?`,
            [req.session.userId]
        );
        
        res.json(stats[0]);
    } catch (error) {
        console.error('Error in getting order statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load order statistics',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
