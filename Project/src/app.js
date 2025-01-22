const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const db = require('./config/database');

// lets grab all our routes from their respective files
const routes = {
    auth: require('./routes/authRoutes'),
    user: require('./routes/userRoutes'),
    seller: require('./routes/sellerRoutes'),
    sellerProduct: require('./routes/sellerProductRoutes'),
    sellerOrder: require('./routes/sellerOrderRoutes'),
    sellerSettings: require('./routes/sellerSettingsRoutes'),
    dashboard: require('./routes/dashboardRoutes'),
    customerOrder: require('./routes/customerOrderRoutes'),
    category: require('./routes/categoryRoutes'),
    search: require('./routes/searchRoutes'),
    review: require('./routes/reviewRoutes'),
    store: require('./routes/storeRoutes'),
    product: require('./routes/productRoutes'),
    cart: require('./routes/cartRoutes'),
    productReview: require('./routes/productReviewRoutes')
};

const app = express();

// Set up the view engine and configure it propperly
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // Set default layout to user layout
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// figure out which layout to use based on the route
app.use((req, res, next) => {
    // Switch to seller layout when we're dealing with seller routes
    if (req.path.startsWith('/seller')) {
        res.locals.layout = 'seller/layout';
    } else {
        res.locals.layout = 'layout';
    }
    next();
});

// Security middleware
const cspSources = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://code.jquery.com"],
    scriptSrcAttr: ["'unsafe-inline'"],
    scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://code.jquery.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
    connectSrc: ["'self'", "ws:", "wss:"],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"]
};

app.use(helmet({
    contentSecurityPolicy: { 
        directives: cspSources,
        useDefaults: false
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Essential middlewares 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // This line is important for PUT/DELETE requests

// setup session management (keeps track of user login state)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages middleware
app.use(flash());

// make sure flash messages are accessable everywhere in our views
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/uploads', express.static('uploads'));

// Make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? req.session.user : null;
    res.locals.isLoggedIn = !!req.session.userId;
    next();
});

// Authentication middleware
const auth = {
    requireLogin(req, res, next) {
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }
        next();
    },
    requireSeller(req, res, next) {
        if (!req.session.userId || !req.session.user || req.session.user.User_Type !== 'seller') {
            console.log('Seller auth failed:', {
                userId: req.session.userId,
                userType: req.session?.user?.User_Type
            });
            return res.redirect('/auth/seller-login');
        }
        next();
    }
};

// Routes
app.get('/', (req, res) => res.redirect('/dashboard'));

// Auth routes
app.use('/auth', routes.auth);

// User routes that require login
app.use('/user', auth.requireLogin, routes.user);
app.use('/cart', auth.requireLogin, routes.cart);
app.use('/orders', auth.requireLogin, routes.customerOrder);

// Public routes (accessible by all users including sellers)
app.use('/dashboard', routes.dashboard);
app.use('/categories', routes.category);
app.use('/search', routes.search);
app.use('/reviews', routes.review);
app.use('/stores', routes.store);
app.use('/products', routes.product);

// Review routes
const productReviewRoutes = require('./routes/productReviewRoutes');
const storeReviewRoutes = require('./routes/storeReviewRoutes');

app.use('/api/product-reviews', productReviewRoutes);
app.use('/api/store-reviews', storeReviewRoutes);

// Seller routes (all require seller authentication)
app.use('/seller/settings', auth.requireLogin, auth.requireSeller, routes.sellerSettings);
app.use('/seller/orders', auth.requireLogin, auth.requireSeller, routes.sellerOrder);
app.use('/seller/products', auth.requireLogin, auth.requireSeller, routes.sellerProduct);
app.use('/seller', auth.requireLogin, auth.requireSeller, routes.seller);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error',
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = app;
