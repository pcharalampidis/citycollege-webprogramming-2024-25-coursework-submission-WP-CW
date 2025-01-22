const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session?.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Get user profile page
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        // Get user data including role
        const [users] = await db.query(
            'SELECT Username_Id, First_Name, Last_Name, Email, Address, User_Type FROM USER WHERE Username_Id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.redirect('/');
        }

        // Get additional seller data if user is a seller
        let sellerData = null;
        if (users[0].User_Type === 'seller') {
            const [sellers] = await db.query(
                'SELECT Shop_Name, Business_Phone, Business_Address, Tax_Number FROM SELLER WHERE Username_Id = ?',
                [req.session.userId]
            );
            if (sellers.length > 0) {
                sellerData = sellers[0];
            }
        }

        res.render('profile', {
            title: 'My Profile',
            user: users[0],
            sellerData,
            cssFiles: ['user/profile'],
            jsFiles: ['user/profile']
        });
    } catch (error) {
        console.error('Error in profile route:', error);
        res.redirect('/dashboard');
    }
});

// Update user profile
router.post('/profile', isAuthenticated, async (req, res) => {
    try {
        const { firstName, lastName, email, address } = req.body;
        
        await db.query(
            'UPDATE USER SET First_Name = ?, Last_Name = ?, Email = ?, Address = ? WHERE Username_Id = ?',
            [firstName, lastName, email, address, req.session.userId]
        );

        res.redirect('/user/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.redirect('/user/profile');
    }
});

// Change password
router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return res.redirect('/user/profile');
        }

        // Get user's current password
        const [users] = await db.query('SELECT Password FROM USER WHERE Username_Id = ?', [req.session.userId]);
        
        if (users.length === 0) {
            return res.redirect('/user/profile');
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, users[0].Password);
        if (!isMatch) {
            return res.redirect('/user/profile');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query('UPDATE USER SET Password = ? WHERE Username_Id = ?', [hashedPassword, req.session.userId]);

        res.redirect('/user/profile');
    } catch (error) {
        console.error('Error changing password:', error);
        res.redirect('/user/profile');
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query('SELECT Username_Id, First_Name, Last_Name, Email, Address FROM USER');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const [user] = await db.query('SELECT Username_Id, First_Name, Last_Name, Email, Address FROM USER WHERE Username_Id = ?', 
            [req.params.id]);
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { Username_Id, First_Name, Last_Name, Birth_Date, Email, Password, Address, Gender } = req.body;
        const hashedPassword = await bcrypt.hash(Password, 10);
        
        await db.query(
            'INSERT INTO USER (Username_Id, First_Name, Last_Name, Birth_Date, Email, Password, Address, Gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [Username_Id, First_Name, Last_Name, Birth_Date, Email, hashedPassword, Address, Gender]
        );
        
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { First_Name, Last_Name, Email, Address } = req.body;
        
        await db.query(
            'UPDATE USER SET First_Name = ?, Last_Name = ?, Email = ?, Address = ? WHERE Username_Id = ?',
            [First_Name, Last_Name, Email, Address, req.params.id]
        );
        
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM USER WHERE Username_Id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile
router.put('/profile/:id', isAuthenticated, async (req, res) => {
    if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        const { First_Name, Last_Name, Email, Address } = req.body;
        
        // Check if email is already taken by another user
        const [existingUsers] = await db.query(
            'SELECT 1 FROM USER WHERE Email = ? AND Username_Id != ?',
            [Email, req.session.userId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email is already in use' });
        }

        await db.query(
            'UPDATE USER SET First_Name = ?, Last_Name = ?, Email = ?, Address = ? WHERE Username_Id = ?',
            [First_Name, Last_Name, Email, Address, req.session.userId]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Update password
router.put('/profile/:id/password', isAuthenticated, async (req, res) => {
    if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }

        // Verify current password
        const [users] = await db.query(
            'SELECT Password FROM USER WHERE Username_Id = ?',
            [req.session.userId]
        );

        const isValidPassword = await bcrypt.compare(currentPassword, users[0].Password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE USER SET Password = ? WHERE Username_Id = ?',
            [hashedPassword, req.session.userId]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
});

module.exports = router;
