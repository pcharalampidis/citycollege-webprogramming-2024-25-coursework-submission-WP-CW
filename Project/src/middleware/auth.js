const db = require('../config/database');

// Authentication middleware
exports.isAuthenticated = async (req, res, next) => {
    if (!req.session.userId) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        req.flash('error', 'Please log in to continue');
        return res.redirect('/auth/login');
    }

    try {
        const connection = await db.getConnection();
        try {
            // grab fresh user data from db if we dont have it
            const [users] = await connection.query(
                'SELECT * FROM USER WHERE Username_Id = ?', 
                [req.session.userId]
            );

            if (users.length === 0) {
                req.session.destroy();
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Invalid user session' });
                }
                req.flash('error', 'Invalid user session');
                return res.redirect('/auth/login');
            }
            req.user = users[0];
            req.session.userType = users[0].User_Type.toLowerCase(); // Set user type in session
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(500).json({ error: 'Authentication error' });
            }
            req.flash('error', 'Authentication error');
            return res.redirect('/auth/login');
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Database connection error:', error);
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(500).json({ error: 'Database connection error' });
        }
        req.flash('error', 'Database connection error');
        return res.redirect('/auth/login');
    }
};

// Seller middleware
exports.isSeller = (req, res, next) => {
    if (!req.session.userType || req.session.userType !== 'seller' || !req.session.storeId) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Access denied. Seller account required.' });
        }
        req.flash('error', 'Access denied. Seller account required.');
        return res.redirect('/auth/seller/login');
    }
    next();
};

// Customer middleware
exports.isCustomer = (req, res, next) => {
    if (!req.user || req.user.User_Type.toLowerCase() !== 'customer') {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Access denied. Customer account required.' });
        }
        req.flash('error', 'Access denied. Customer account required.');
        return res.redirect('/auth/login');
    }
    next();
};
