const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { filterProducts, sortProducts } = require('../utils/productFilters');

// Search products
router.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 12; 
        const offset = (page - 1) * limit;

        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(DISTINCT p.Product_ID) as total 
             FROM PRODUCT p
             INNER JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
             WHERE (p.Name LIKE ? OR p.Description LIKE ?)
             AND ps.Stock > 0`,
            [`%${searchQuery}%`, `%${searchQuery}%`]
        );
        const totalItems = countResult[0].total;

        // Get products with pagination
        const [products] = await db.query(
            `SELECT DISTINCT
                p.Product_ID,
                p.Name,
                p.Type_ID,
                p.Specification,
                p.Description,
                p.Category_ID,
                p.Image_URL,
                p.Publication_Year,
                p.ISBN,
                p.Brand,
                p.Model,
                a.Name as AuthorName,
                a.Biography as AuthorBio,
                c.Name_Type as CategoryName,
                pt.Type_Name as ProductType,
                MIN(ps.Price) as MinPrice,
                GROUP_CONCAT(DISTINCT ps.Store_ID) as StoreIDs,
                (
                    SELECT Store_ID 
                    FROM PRODUCT_STORE ps2 
                    WHERE ps2.Product_ID = p.Product_ID 
                    AND ps2.Price = MIN(ps.Price)
                    LIMIT 1
                ) as BestStoreID,
                SUM(ps.Stock) as TotalStock
             FROM PRODUCT p
             INNER JOIN PRODUCT_STORE ps ON p.Product_ID = ps.Product_ID
             LEFT JOIN AUTHORS a ON p.Author_ID = a.Author_ID
             LEFT JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
             LEFT JOIN PRODUCT_TYPES pt ON p.Type_ID = pt.Type_ID
             WHERE (p.Name LIKE ? OR p.Description LIKE ?)
             GROUP BY p.Product_ID
             HAVING TotalStock > 0
             LIMIT ? OFFSET ?`,
            [`%${searchQuery}%`, `%${searchQuery}%`, limit, offset]
        );

        // Calculate total pages
        const totalPages = Math.ceil(totalItems / limit);

        // Get categories for filtering options
        const [categories] = await db.query('SELECT DISTINCT Name_Type FROM CATEGORIES ORDER BY Name_Type');

        if (req.headers.accept === 'application/json') {
            return res.json({
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    searchQuery
                }
            });
        }

        res.render('search', {
            products,
            searchQuery,
            currentPage: page,
            totalPages,
            totalItems,
            categories,
            filters: {
                search: searchQuery,
                category: req.query.category || '',
                sort: req.query.sort || 'name_asc'
            },
            user: req.session.user,
            title: 'Search Results'
        });

    } catch (error) {
        if (req.headers.accept === 'application/json') {
            return res.status(500).json({ message: error.message });
        }
        console.error('Search error:', error);
        res.status(500).render('error', {
            message: 'Error performing search',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router;
