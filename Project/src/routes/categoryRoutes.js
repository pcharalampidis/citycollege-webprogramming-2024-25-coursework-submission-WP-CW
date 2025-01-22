const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM CATEGORIES');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get categories by type
router.get('/api/categories', async (req, res) => {
    try {
        const { typeId } = req.query;
        let query = 'SELECT * FROM CATEGORIES';
        let params = [];

        if (typeId) {
            query += ' WHERE Type_ID = ?';
            params.push(typeId);
        }

        query += ' ORDER BY Name_Type';

        const [categories] = await db.query(query, params);
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create new category
router.post('/', async (req, res) => {
  try {
    const { Name_Type } = req.body;
    const [result] = await db.query(
      'INSERT INTO CATEGORIES (Name_Type) VALUES (?)',
      [Name_Type]
    );
    res.status(201).json({ 
      message: 'Category created successfully',
      categoryId: result.insertId 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
