const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Customer Login page
router.get('/login', (req, res) => {
    try {
        if (req.session.userId) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', { 
            title: 'Login',
            cssFiles: ['auth'],
            jsFiles: ['auth']
        });
    } catch (error) {
        console.error('Error rendering login page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load login page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Customer Register page
router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/register', { 
        title: 'Register',
        cssFiles: ['auth'],
        jsFiles: ['auth']
    });
});

// Seller Login page
router.get('/seller/login', (req, res) => {
    try {
        if (req.session.userId && req.session.userType === 'seller') {
            return res.redirect('/seller/dashboard');
        }
        res.render('auth/seller-login', { 
            title: 'Seller Login',
            cssFiles: ['auth'],
            jsFiles: ['auth']
        });
    } catch (error) {
        console.error('Error rendering seller login page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load seller login page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Seller Register page
router.get('/seller/register', (req, res) => {
    res.render('auth/seller-register', { 
        title: 'Seller Registration',
        cssFiles: ['auth'],
        jsFiles: ['auth']
    });
});

// Handle customer login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.redirect('/auth/login');
        }

        // Check if user exists and if they are also a seller
        const [users] = await db.query(`
            SELECT u.*, 
                   CASE WHEN s.Username_Id IS NOT NULL THEN 1 ELSE 0 END as isSeller,
                   s.Store_ID
            FROM USER u
            LEFT JOIN SELLER s ON u.Username_Id = s.Username_Id
            WHERE u.Email = ?
        `, [email]);
        
        if (users.length === 0) {
            return res.redirect('/auth/login');
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.Password);
        
        if (!validPassword) {
            return res.redirect('/auth/login');
        }

        // Set session data
        req.session.userId = user.Username_Id;
        req.session.userType = user.User_Type;
        if (user.isSeller) {
            req.session.storeId = user.Store_ID;
        }
        
        // Set user data in session
        req.session.user = {
            Username_Id: user.Username_Id,
            First_Name: user.First_Name,
            Last_Name: user.Last_Name,
            Email: user.Email,
            User_Type: user.User_Type,
            isSeller: user.isSeller === 1,
            Store_ID: user.Store_ID
        };
        
        // Log session data for debugging
        console.log('Session after login:', {
            userId: req.session.userId,
            userType: req.session.userType,
            isSeller: user.isSeller === 1,
            sessionID: req.sessionID
        });

        if (user.User_Type === 'seller') {
            res.redirect('/seller/dashboard');
        } else {
            res.redirect('/dashboard');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred during login',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Handle seller login
router.post('/seller/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('auth/seller-login', {
                title: 'Seller Login',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Email and password are required'
            });
        }

        // Get user and seller info in one query
        const [sellers] = await db.query(`
            SELECT u.*, s.Store_ID, s.Shop_Name, s.Business_Phone, s.Business_Address
            FROM USER u
            JOIN SELLER s ON u.Username_Id = s.Username_Id
            WHERE u.Email = ? AND u.User_Type = 'seller'
        `, [email]);

        if (sellers.length === 0) {
            return res.render('auth/seller-login', {
                title: 'Seller Login',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Invalid email or password'
            });
        }

        const seller = sellers[0];
        const validPassword = await bcrypt.compare(password, seller.Password);

        if (!validPassword) {
            return res.render('auth/seller-login', {
                title: 'Seller Login',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Invalid email or password'
            });
        }

        // Set session data
        req.session.userId = seller.Username_Id;
        req.session.userType = 'seller';
        req.session.storeId = seller.Store_ID;
        req.session.shopName = seller.Shop_Name;
        req.session.user = {
            Username_Id: seller.Username_Id,
            First_Name: seller.First_Name,
            Last_Name: seller.Last_Name,
            Email: seller.Email,
            User_Type: seller.User_Type,
            Store_ID: seller.Store_ID,
            Shop_Name: seller.Shop_Name,
            Business_Phone: seller.Business_Phone,
            Business_Address: seller.Business_Address
        };

        console.log('Seller login successful - Session data:', {
            userId: req.session.userId,
            userType: req.session.userType,
            storeId: req.session.storeId,
            shopName: req.session.shopName,
            user: req.session.user
        });

        res.redirect('/seller/dashboard');
    } catch (error) {
        console.error('Seller login error:', error);
        res.render('auth/seller-login', {
            title: 'Seller Login',
            cssFiles: ['auth'],
            jsFiles: ['auth'],
            error: 'An error occurred during login. Please try again.'
        });
    }
});

// Handle customer registration
router.post('/register', async (req, res) => {
    const connection = await db.getConnection();
    console.log('Registration attempt with data:', {
        ...req.body,
        password: '[REDACTED]'
    });
    
    try {
        const { email, password, firstName, lastName, gender, address, confirmPassword } = req.body;
        
        // Validate required fields
        if (!email || !password || !firstName || !lastName || !confirmPassword) {
            console.log('Missing required fields');
            return res.render('auth/register', {
                title: 'Register',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'All fields are required'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('auth/register', {
                title: 'Register',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Passwords do not match'
            });
        }

        // Generate username from email 
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString(36);
        console.log('Generated username:', username);

        // start transaction before any database operations
        await connection.beginTransaction();

        // Check if email already exists
        const [existingUsers] = await connection.query('SELECT * FROM USER WHERE Email = ?', [email]);
        console.log('Existing users with email:', existingUsers.length);
        
        if (existingUsers.length > 0) {
            await connection.rollback();
            console.log('Email already exists');
            return res.render('auth/register', {
                title: 'Register',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Insert into USER table
        const [userResult] = await connection.query(
            'INSERT INTO USER (Username_Id, First_Name, Last_Name, Email, Password, Gender, User_Type, Address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, firstName, lastName, email, hashedPassword, gender || null, 'customer', address || null]
        );
        console.log('User inserted successfully:', userResult.insertId);

        // Commit transaction
        await connection.commit();
        console.log('Transaction committed');

        // Set session data with complete user information
        req.session.userId = username;
        req.session.userType = 'customer';
        req.session.user = {
            Username_Id: username,
            First_Name: firstName,
            Last_Name: lastName,
            Email: email,
            User_Type: 'customer',
            Address: address || null,
            Gender: gender || null
        };

        res.redirect('/dashboard');

    } catch (error) {
        // Rollback on error
        await connection.rollback();
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register',
            cssFiles: ['auth'],
            jsFiles: ['auth'],
            error: 'An error occurred during registration. Please try again.'
        });
    } finally {
        connection.release();
        console.log('Connection released');
    }
});

// Process new seller signups (needs extra validation)
router.post('/seller/register', async (req, res) => {
    const connection = await db.getConnection();
    console.log('Seller registration attempt with data:', {
        ...req.body,
        password: '[REDACTED]'
    });
    
    try {
        const {
            email,
            password,
            confirmPassword,
            shopName,
            taxNumber,
            businessPhone,
            businessAddress,
            firstName,
            lastName,
            terms
        } = req.body;

        // Validate required fields
        if (!email || !password || !confirmPassword || !shopName || !taxNumber || 
            !businessPhone || !businessAddress || !firstName || !lastName) {
            return res.render('auth/seller-register', {
                title: 'Seller Registration',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'All fields are required'
            });
        }

        // Check terms acceptance
        if (!terms) {
            return res.render('auth/seller-register', {
                title: 'Seller Registration',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'You must accept the Terms and Conditions'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('auth/seller-register', {
                title: 'Seller Registration',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Passwords do not match'
            });
        }

        // Generate username from shop name (remove special chars, add timestamp)
        const username = shopName.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString(36);
        console.log('Generated username:', username);

        await connection.beginTransaction();

        // Check if user/seller already exists
        const [existingUsers] = await connection.query('SELECT * FROM USER WHERE Email = ?', [email]);
        const [existingTax] = await connection.query('SELECT * FROM SELLER WHERE Tax_Number = ?', [taxNumber]);

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.render('auth/seller-register', {
                title: 'Seller Registration',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Email already exists'
            });
        }

        if (existingTax.length > 0) {
            await connection.rollback();
            return res.render('auth/seller-register', {
                title: 'Seller Registration',
                cssFiles: ['auth'],
                jsFiles: ['auth'],
                error: 'Tax number already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Create store first
        const [storeResult] = await connection.query(
            'INSERT INTO STORE (Name, Description, Address, Phone, Email) VALUES (?, ?, ?, ?, ?)',
            [shopName, `${shopName} - Online Store`, businessAddress, businessPhone, email]
        );
        console.log('Store created successfully:', storeResult.insertId);

        // Insert user with seller type
        await connection.query(
            'INSERT INTO USER (Username_Id, First_Name, Last_Name, Email, Password, Address, User_Type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, firstName, lastName, email, hashedPassword, businessAddress, 'seller']
        );
        console.log('User created successfully');

        // Insert seller information with store ID
        await connection.query(
            'INSERT INTO SELLER (Username_Id, Store_ID, Shop_Name, Tax_Number, Business_Phone, Business_Address) VALUES (?, ?, ?, ?, ?, ?)',
            [username, storeResult.insertId, shopName, taxNumber, businessPhone, businessAddress]
        );
        console.log('Seller information added successfully');

        await connection.commit();
        console.log('Transaction committed');

        // Set session data with complete user and seller information
        req.session.userId = username;
        req.session.userType = 'seller';
        req.session.storeId = storeResult.insertId;
        req.session.shopName = shopName;
        req.session.user = {
            Username_Id: username,
            First_Name: firstName,
            Last_Name: lastName,
            Email: email,
            User_Type: 'seller',
            Store_ID: storeResult.insertId,
            Shop_Name: shopName,
            Business_Phone: businessPhone,
            Business_Address: businessAddress
        };

        res.redirect('/seller/dashboard');

    } catch (error) {
        await connection.rollback();
        console.error('Seller registration error:', error);
        res.render('auth/seller-register', {
            title: 'Seller Registration',
            cssFiles: ['auth'],
            jsFiles: ['auth'],
            error: 'An error occurred during registration. Please try again.'
        });
    } finally {
        connection.release();
        console.log('Connection released');
    }
});

// quick endpoint to chek if user is logged in
router.get('/status', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({
                isLoggedIn: false,
                userId: null,
                user: null
            });
        }

        // Get user data
        const [users] = await db.query(
            'SELECT Username_Id, Email, First_Name, Last_Name, Address FROM USER WHERE Username_Id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            req.session.destroy();
            return res.json({
                isLoggedIn: false,
                userId: null,
                user: null
            });
        }

        res.json({
            isLoggedIn: true,
            userId: req.session.userId,
            user: users[0]
        });
    } catch (error) {
        console.error('Error getting auth status:', error);
        res.status(500).json({
            error: 'Failed to get auth status',
            isLoggedIn: false,
            userId: null,
            user: null
        });
    }
});

// Get user info
router.get('/user-info', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [users] = await db.query(
            'SELECT Username_Id, Email, First_Name, Last_Name, Address FROM USER WHERE Username_Id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Test database connection
router.get('/test-db', async (req, res) => {
    try {
        const connection = await db.getConnection();
        console.log('Database connection successful');
        
        try {
            // Test query to check if USER table exists and is accessible
            const [rows] = await connection.query('SELECT COUNT(*) as count FROM USER');
            console.log('User count:', rows[0].count);
            
            // Test query to show table structure
            const [columns] = await connection.query('SHOW COLUMNS FROM USER');
            console.log('USER table structure:', columns);
            
            res.json({
                status: 'success',
                message: 'Database connection successful',
                userCount: rows[0].count,
                tableStructure: columns
            });
        } catch (error) {
            console.error('Database query error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Database query failed',
                error: error.message
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Could not connect to database',
            error: error.message
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    // Log session data before destroying
    console.log('Session before logout:', {
        userId: req.session.userId,
        userType: req.session.userType,
        sessionID: req.sessionID
    });

    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to logout',
                error: process.env.NODE_ENV === 'development' ? err : {}
            });
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;
