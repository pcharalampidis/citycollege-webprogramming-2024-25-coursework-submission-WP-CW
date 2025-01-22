const db = require('../config/database');

// Grabs all the important stats for a seller's store
async function getSellerStats(storeId) {
    try {
        // Pull the total number of orders n' revenue
        const [orderStats] = await db.query(`
            SELECT COUNT(*) as totalOrders, 
                   COALESCE(SUM(Total_Amount), 0) as totalRevenue
            FROM ORDERS 
            WHERE Store_ID = ?
        `, [storeId]);

        // Count how many products they've got
        const [productStats] = await db.query(`
            SELECT COUNT(*) as totalProducts
            FROM PRODUCT 
            WHERE Store_ID = ?
        `, [storeId]);

        return {
            totalOrders: orderStats[0].totalOrders,
            totalRevenue: orderStats[0].totalRevenue,
            totalProducts: productStats[0].totalProducts
        };
    } catch (error) {
        console.error('Error getting seller stats:', error);
        return {
            totalOrders: 0,
            totalRevenue: 0,
            totalProducts: 0
        };
    }
}

// Gets the most recent orders for the store (defualts to last 5)
async function getRecentOrders(storeId, limit = 5) {
    try {
        const [orders] = await db.query(`
            SELECT o.Order_ID, 
                   o.Date,
                   o.Status,
                   o.Total_Amount,
                   u.Email as customer_email,
                   GROUP_CONCAT(p.Name) as products
            FROM ORDERS o
            JOIN USER u ON o.Username_Id = u.Username_Id
            JOIN ORDER_ITEMS oi ON o.Order_ID = oi.Order_ID
            JOIN PRODUCT p ON oi.Product_ID = p.Product_ID
            WHERE o.Store_ID = ?
            GROUP BY o.Order_ID
            ORDER BY o.Date DESC
            LIMIT ?
        `, [storeId, limit]);

        return orders;
    } catch (error) {
        console.error('Error getting recent orders:', error);
        return [];
    }
}

// Fetches the newest products added to the store
async function getRecentProducts(storeId, limit = 5) {
    try {
        const [products] = await db.query(`
            SELECT Product_ID, 
                   Name,
                   Price,
                   Stock,
                   Image_URL
            FROM PRODUCT
            WHERE Store_ID = ?
            ORDER BY Created_At DESC
            LIMIT ?
        `, [storeId, limit]);

        return products;
    } catch (error) {
        console.error('Error getting recent products:', error);
        return [];
    }
}

// main dashboard logic - shows everything important at a glance
exports.getDashboard = async (req, res) => {
    try {
        const storeId = req.session.storeId;
        
        // Get all dashboard data in parallel
        const [stats, recentOrders, recentProducts] = await Promise.all([
            getSellerStats(storeId),
            getRecentOrders(storeId),
            getRecentProducts(storeId)
        ]);

        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            shopName: req.session.shopName,
            stats,
            orders: recentOrders,
            products: recentProducts,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Error loading seller dashboard:', error);
        req.flash('error', 'Failed to load dashboard data');
        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            shopName: req.session.shopName,
            stats: {},
            orders: [],
            products: [],
            messages: {
                error: 'Failed to load dashboard data'
            }
        });
    }
};

// Handles removing products from the store 
exports.deleteProduct = async (req, res) => {
    const productId = req.params.id;
    const storeId = req.session.storeId;

    try {
        // Check if product belongs to seller
        const [product] = await db.query(
            'SELECT 1 FROM PRODUCT WHERE Product_ID = ? AND Store_ID = ?',
            [productId, storeId]
        );

        if (product.length === 0) {
            req.flash('error', 'Product not found or you do not have permission to delete it');
            return res.redirect('/seller/dashboard');
        }

        // Delete product
        await db.query('DELETE FROM PRODUCT WHERE Product_ID = ?', [productId]);

        req.flash('success', 'Product deleted successfully');
        res.redirect('/seller/dashboard');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Failed to delete product');
        res.redirect('/seller/dashboard');
    }
};
