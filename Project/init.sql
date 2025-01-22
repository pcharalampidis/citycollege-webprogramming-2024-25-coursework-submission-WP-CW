CREATE DATABASE IF NOT EXISTS SkroutzDB;
USE SkroutzDB;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS STORE_REVIEW;
DROP TABLE IF EXISTS PRODUCT_REVIEW;
DROP TABLE IF EXISTS `ORDER`;
DROP TABLE IF EXISTS CART;
DROP TABLE IF EXISTS USER_FAVORITES;
DROP TABLE IF EXISTS USER_INTERESTS;
DROP TABLE IF EXISTS PRODUCT_STORE;
DROP TABLE IF EXISTS SELLER;
DROP TABLE IF EXISTS PRODUCT;
DROP TABLE IF EXISTS STORE;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS CATEGORIES;
DROP TABLE IF EXISTS PRODUCT_TYPES;
DROP TABLE IF EXISTS AUTHORS;
DROP TABLE IF EXISTS BOOK_DETAILS;
DROP TABLE IF EXISTS ELECTRONICS_DETAILS;

CREATE TABLE PRODUCT_TYPES (
    Type_ID INT PRIMARY KEY AUTO_INCREMENT,
    Type_Name VARCHAR(50) NOT NULL,
    Type_Description TEXT
);

CREATE TABLE CATEGORIES (
    Category_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name_Type VARCHAR(255) NOT NULL,
    Type_ID INT,
    FOREIGN KEY (Type_ID) REFERENCES PRODUCT_TYPES(Type_ID)
);

CREATE TABLE AUTHORS (
    Author_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    Biography TEXT,
    Birth_Year INT,
    Death_Year INT
);

CREATE TABLE STORE (
    Store_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    Description TEXT,
    Address VARCHAR(255),
    Phone VARCHAR(20),
    Email VARCHAR(255),
    Rating DECIMAL(3,1)
);

CREATE TABLE USER (
    Username_Id VARCHAR(50) PRIMARY KEY,
    First_Name VARCHAR(50),
    Last_Name VARCHAR(50),
    Birth_Date DATE,
    Email VARCHAR(100) UNIQUE,
    Password VARCHAR(255),
    Address TEXT,
    Gender VARCHAR(20),
    User_Type ENUM('customer', 'seller') DEFAULT 'customer'
);

CREATE TABLE SELLER (
    Username_Id VARCHAR(50) PRIMARY KEY,
    Store_ID INT NOT NULL,
    Shop_Name VARCHAR(255) NOT NULL,
    Tax_Number VARCHAR(50) NOT NULL UNIQUE,
    Business_Phone VARCHAR(20) NOT NULL,
    Business_Address TEXT NOT NULL,
    Registration_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Username_Id) REFERENCES USER(Username_Id),
    FOREIGN KEY (Store_ID) REFERENCES STORE(Store_ID)
);

CREATE TABLE PRODUCT (
    Product_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    Type_ID INT NOT NULL,
    Author_ID INT DEFAULT NULL,  
    Specification TEXT,
    Description TEXT,
    Category_ID INT,
    Image_URL VARCHAR(255) DEFAULT '/images/default.jpg',
    Brand VARCHAR(255),          
    Model VARCHAR(255),          
    Publication_Year INT,        
    ISBN VARCHAR(13),            
    FOREIGN KEY (Type_ID) REFERENCES PRODUCT_TYPES(Type_ID),
    FOREIGN KEY (Category_ID) REFERENCES CATEGORIES(Category_ID),
    FOREIGN KEY (Author_ID) REFERENCES AUTHORS(Author_ID)
);

CREATE TABLE PRODUCT_STORE (
    Product_ID INT,
    Store_ID INT,
    Price DECIMAL(10,2),
    Stock INT,
    PRIMARY KEY (Product_ID, Store_ID),
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Store_ID) REFERENCES STORE(Store_ID) ON DELETE CASCADE
);

CREATE TABLE CART (
    cart_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50),
    product_id INT,
    Store_id INT,
    quantity INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(Username_Id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCT(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Store_id) REFERENCES STORE(Store_ID) ON DELETE CASCADE
);

CREATE TABLE USER_FAVORITES (
    Username_Id VARCHAR(50),
    Product_ID INT,
    PRIMARY KEY (Username_Id, Product_ID),
    FOREIGN KEY (Username_Id) REFERENCES USER(Username_Id) ON DELETE CASCADE,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT(Product_ID) ON DELETE CASCADE
);

CREATE TABLE USER_INTERESTS (
    Username_Id VARCHAR(50),
    Category_ID INT,
    PRIMARY KEY (Username_Id, Category_ID),
    FOREIGN KEY (Username_Id) REFERENCES USER(Username_Id) ON DELETE CASCADE,
    FOREIGN KEY (Category_ID) REFERENCES CATEGORIES(Category_ID) ON DELETE CASCADE
);

CREATE TABLE `ORDER` (
    Order_ID INT PRIMARY KEY AUTO_INCREMENT,
    User_ID VARCHAR(50),
    Product_ID INT,
    Store_ID INT,
    Quantity INT NOT NULL DEFAULT 1,
    Price DECIMAL(10,2) NOT NULL,
    Total_Amount DECIMAL(10,2) NOT NULL,
    Shipping_Address TEXT,
    Status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES USER(Username_Id) ON DELETE RESTRICT,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT(Product_ID) ON DELETE RESTRICT,
    FOREIGN KEY (Store_ID) REFERENCES STORE(Store_ID) ON DELETE RESTRICT
);

CREATE TABLE PRODUCT_REVIEW (
    Review_ID INT PRIMARY KEY AUTO_INCREMENT,
    User_ID VARCHAR(50),
    Product_ID INT,
    Order_ID INT,
    Rating DECIMAL(2,1),
    Comments TEXT,
    Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES USER(Username_Id) ON DELETE CASCADE,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Order_ID) REFERENCES `ORDER`(Order_ID) ON DELETE CASCADE
);

CREATE TABLE STORE_REVIEW (
    Review_ID INT PRIMARY KEY AUTO_INCREMENT,
    User_ID VARCHAR(50),
    Store_ID INT,
    Order_ID INT,
    Rating DECIMAL(2,1),
    Comments TEXT,
    Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES USER(Username_Id) ON DELETE CASCADE,
    FOREIGN KEY (Store_ID) REFERENCES STORE(Store_ID) ON DELETE CASCADE,
    FOREIGN KEY (Order_ID) REFERENCES `ORDER`(Order_ID) ON DELETE CASCADE
);

-- 1. First insert the basic types and categories (no dependencies)
INSERT INTO PRODUCT_TYPES (Type_Name, Type_Description) VALUES
('Books', 'Physical and digital books'),
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Home & Garden', 'Home decor and gardening supplies');

INSERT INTO CATEGORIES (Name_Type, Type_ID) VALUES
    -- Book categories (Type_ID = 1)
('Science Fiction', 1),
('Fantasy', 1),
('Romance', 1),
('History', 1),
    -- Electronics categories (Type_ID = 2)
('Smartphones', 2),
('Laptops', 2),
('Accessories', 2),
    -- Clothing categories (Type_ID = 3)
('Men''s Wear', 3),
('Women''s Wear', 3),
('Children''s Wear', 3),
    -- Home & Garden categories (Type_ID = 4)
('Furniture', 4),
('Garden Tools', 4),
('Home Decor', 4);

-- 2. Insert authors (no dependencies)
INSERT INTO AUTHORS (Name, Biography, Birth_Year, Death_Year) VALUES
('Frank Herbert', 'American science fiction author best known for the Dune series', 1920, 1986),
('Isaac Asimov', 'Russian-born American author and professor of biochemistry', 1920, 1992),
('William Gibson', 'American-Canadian science fiction author', 1948, NULL),
('Neal Stephenson', 'American science fiction author', 1959, NULL),
('J.R.R. Tolkien', 'English writer, poet, and philologist', 1892, 1973),
('George Orwell', 'English novelist and essayist', 1903, 1950),
('Aldous Huxley', 'English writer and philosopher', 1894, 1963),
('F. Scott Fitzgerald', 'American novelist and short story writer', 1896, 1940),
('Jane Austen', 'English novelist known for romantic fiction', 1775, 1817),
('J.D. Salinger', 'American writer', 1919, 2010);

-- 3. Insert stores (no dependencies)
INSERT INTO STORE (Name, Description, Address, Phone, Email, Rating) VALUES
('Athens Books & Tech', 'Large store with books and electronics', '123 Oak St, Athens', '+30 210 1234567', 'info@athensbooks.gr', 4.5),
('Thessaloniki Reads', 'Cozy bookstore with coffee shop', '456 Pine St, Thessaloniki', '+30 231 4567890', 'contact@thessreads.gr', 4.7),
('Patras Pages', 'Academic and general books', '789 Elm St, Patras', '+30 261 7890123', 'hello@patraspages.gr', 4.2),
('Heraklion Books', 'Family-owned bookstore', '321 Maple St, Heraklion', '+30 281 3456789', 'shop@heraklionbooks.gr', 4.8),
('Larissa Bookworm', 'New and used books', '654 Birch St, Larissa', '+30 241 6789012', 'sales@larissabooks.gr', 4.4),
('Volos Electronics', 'Electronics and gadgets', '987 Cedar St, Volos', '+30 421 9012345', 'sales@volostech.gr', 4.6),
('Ioannina Fashion', 'Trendy clothing store', '147 Walnut St, Ioannina', '+30 265 2345678', 'store@ioannafashion.gr', 4.3),
('Rhodes Home Store', 'Home decor and furniture', '258 Beach St, Rhodes', '+30 224 5678901', 'info@rhodeshome.gr', 4.5),
('Tech Haven', 'Premium electronics store', '789 Spruce Rd, Chania', '+30 282 1234567', 'sales@techhaven.gr', 4.3),
('Mega Store', 'Multi-category retail store', '321 Ash St, Kavala', '+30 251 8901234', 'info@megastore.gr', 4.9),
('Elite Fashion', 'High-end fashion boutique', '123 Fashion Ave, Athens', '+30 210 1234567', 'elite@fashion.gr', 4.5),
('Style Studio', 'Contemporary fashion store', '456 Style St, Athens', '+30 210 2345678', 'style@studio.gr', 4.3),
('Kids Kingdom', 'Children''s clothing and accessories', '789 Kids Way, Athens', '+30 210 3456789', 'kids@kingdom.gr', 4.4),
('Home Haven', 'Home furniture and decor', '654 Home St, Athens', '+30 210 4567890', 'home@haven.gr', 4.6),
('Garden Glory', 'Garden tools and supplies', '987 Garden Rd, Athens', '+30 210 5678901', 'garden@glory.gr', 4.4),
('Decor Dreams', 'Interior decoration specialists', '147 Decor Ave, Athens', '+30 210 6789012', 'decor@dreams.gr', 4.7),
('Digital World', 'Premium electronics and gadgets store', '123 Tech Blvd, Athens', '+30 210 8901234', 'sales@digitalworld.gr', 4.6),
('Smart Electronics', 'Authorized Apple and Samsung reseller', '456 Innovation St, Thessaloniki', '+30 231 5678901', 'info@smartelectronics.gr', 4.7),
('Gaming Paradise', 'Gaming hardware and accessories', '789 Game Ave, Patras', '+30 261 2345678', 'support@gamingparadise.gr', 4.8);

-- 4. Insert users and sellers (depends on stores)
INSERT INTO USER (Username_Id, First_Name, Last_Name, Birth_Date, Email, Password, Address, Gender, User_Type) VALUES
('testuser', 'Test', 'User', '1990-01-01', 'test@example.com', '$2a$10$6jXRP/WEQD1JqzKH1WH7L.KCB1y8UF7vx5GqF3YZxeGBOlevyoKIi', '123 Test St, Athens', 'Other', 'customer'),
('seller1', 'John', 'Doe', NULL, 'john@example.com', '$2b$10$6jXxQzx8yPHzYX4mxGV1H.x9P.JfPG8RZu8P5q5q5q5q5q5q5q', '123 Seller St, Athens', NULL, 'seller'),
('customer1', 'Jane', 'Smith', NULL, 'jane@example.com', '$2b$10$6jXxQzx8yPHzYX4mxGV1H.x9P.JfPG8RZu8P5q5q5q5q5q5q5q', '456 Customer St, Athens', NULL, 'customer');

INSERT INTO SELLER (Username_Id, Store_ID, Shop_Name, Tax_Number, Business_Phone, Business_Address) VALUES
('seller1', 1, 'Elite Fashion', 'TAX123456789', '+30 210 1234567', '123 Fashion Ave, Athens');

-- 5. Insert all products (depends on product types, categories, and authors)
-- Books
INSERT INTO PRODUCT (Name, Type_ID, Author_ID, Specification, Description, Category_ID, Image_URL, Publication_Year, ISBN) VALUES
('Dune', 1, 1, 'Hardcover, 896 pages', 'Science fiction masterpiece about a desert planet and its spice.', 1, '/bookcover/default.jpg', 1965, '9780441013593'),
('Foundation', 1, 2, 'Paperback, 255 pages', 'First book in Asimov''s epic science fiction series.', 1, '/bookcover/default.jpg', 1951, '9780553293357'),
('Neuromancer', 1, 3, 'Paperback, 271 pages', 'Classic cyberpunk novel that coined the term cyberspace.', 1, '/bookcover/default.jpg', 1984, '9780441569595'),
('Snow Crash', 1, 4, 'Hardcover, 470 pages', 'Science fiction novel exploring virtual reality and linguistics.', 1, '/bookcover/default.jpg', 1992, '9780553380958'),
('The Hobbit', 1, 5, 'Hardcover, 310 pages', 'Fantasy novel about Bilbo Baggins'' journey with dwarves.', 2, '/bookcover/default.jpg', 1937, '9780547928227'),
('1984', 1, 6, 'Paperback, 328 pages', 'Dystopian novel about surveillance and totalitarianism.', 5, '/bookcover/default.jpg', 1949, '9780451524935'),
('Brave New World', 1, 7, 'Paperback, 288 pages', 'Dystopian novel about a genetically engineered future.', 5, '/bookcover/default.jpg', 1932, '9780060850524'),
('The Great Gatsby', 1, 8, 'Hardcover, 180 pages', 'Novel about wealth and decadence in the Jazz Age.', 6, '/bookcover/default.jpg', 1925, '9780743273565'),
('Pride and Prejudice', 1, 9, 'Paperback, 432 pages', 'Classic romance novel about social manners and marriage.', 3, '/bookcover/default.jpg', 1813, '9780141439518'),
('The Catcher in the Rye', 1, 10, 'Hardcover, 234 pages', 'Coming-of-age novel about teenage alienation.', 6, '/bookcover/default.jpg', 1951, '9780316769488');

-- Electronics
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand, Model) VALUES
('iPhone 15 Pro', 2, '256GB, Space Black', 'Latest iPhone with A17 Pro chip and titanium design', 5, '/bookcover/default.jpg', 'Apple', 'iPhone 15 Pro'),
('MacBook Air M2', 2, '13.6", 8GB RAM, 256GB SSD', 'Ultra-thin laptop with Apple M2 chip', 6, '/bookcover/default.jpg', 'Apple', 'MacBook Air M2'),
('Galaxy Buds2 Pro', 2, 'Wireless Earbuds, Black', '24-bit Hi-Fi sound and ANC', 7, '/bookcover/default.jpg', 'Samsung', 'Buds2 Pro'),
('Gaming Laptop Pro', 2, 'Intel i9, 32GB RAM, RTX 4080', 'High-performance gaming laptop', 6, '/bookcover/default.jpg', 'TechBrand', 'GL2023'),
('Wireless Earbuds', 2, 'Active noise cancellation, 24h battery', 'Premium wireless earbuds', 7, '/bookcover/default.jpg', 'AudioTech', 'WE200'),
('Smart Watch Elite', 2, 'Heart rate monitor, GPS, 5-day battery', 'Advanced smartwatch', 7, '/bookcover/default.jpg', 'TechWear', 'SW100'),
('4K Monitor', 2, '4K, 144Hz, 1ms response time', '32-inch 4K gaming monitor', 7, '/bookcover/default.jpg', 'ViewTech', 'VM32'),
('Mechanical Keyboard', 2, 'Blue switches, RGB backlight', 'RGB mechanical gaming keyboard', 7, '/bookcover/default.jpg', 'GameGear', 'MK100');

-- Clothing
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES
('Classic Denim Jacket', 3, 'Size S-XXL, Blue', 'Timeless denim jacket with comfortable fit', 8, '/bookcover/default.jpg', 'Levi''s'),
('Summer Floral Dress', 3, 'Size XS-XL, Multicolor', 'Light and breezy summer dress with floral pattern', 9, '/bookcover/default.jpg', 'Zara'),
('Kids Winter Coat', 3, 'Age 4-12, Navy Blue', 'Warm winter coat for children', 10, '/bookcover/default.jpg', 'H&M');

-- Home & Garden
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES
('Modern Sofa Set', 4, '3-seater, Gray', 'Contemporary sofa set with premium fabric', 11, '/bookcover/default.jpg', 'IKEA'),
('Garden Tool Set', 4, '12 pieces, Stainless Steel', 'Complete set of essential garden tools', 12, '/bookcover/default.jpg', 'Bosch'),
('Decorative Vase', 4, 'Height: 30cm, Ceramic', 'Elegant vase for home decoration', 13, '/bookcover/default.jpg', 'HomeStyle');

-- Insert smartphones
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand, Model) VALUES 
('Galaxy S23 Ultra', 2, '6.8" QHD+, 512GB, 12GB RAM', 'Flagship Android phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'Samsung', 'S23 Ultra'),
('Pixel 8 Pro', 2, '6.7" QHD+, 256GB, 12GB RAM', 'Google flagship phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'Google', 'Pixel 8 Pro'),
('OnePlus 11', 2, '6.7" QHD+, 256GB, 16GB RAM', 'Flagship killer', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'OnePlus', '11'),
('ROG Phone 7', 2, '6.78" FHD+, 512GB, 16GB RAM', 'Gaming phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'ASUS', 'ROG Phone 7'),
('Nothing Phone 2', 2, '6.7" FHD+, 256GB, 12GB RAM', 'Unique design phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'Nothing', 'Phone 2'),
('Xperia 1 V', 2, '6.5" 4K, 256GB, 12GB RAM', 'Professional phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'Sony', 'Xperia 1 V'),
('Find X6 Pro', 2, '6.82" QHD+, 512GB, 16GB RAM', 'Premium phone', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Smartphones'), '/bookcover/default.jpg', 'OPPO', 'Find X6 Pro');

-- Insert laptops
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand, Model) VALUES 
('ROG Zephyrus G14', 2, '14" QHD, Ryzen 9, 32GB RAM, RTX 4090', 'Premium gaming laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'ASUS', 'GA402'),
('XPS 15', 2, '15.6" 4K OLED, i9, 32GB RAM, RTX 4070', 'Premium workstation laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Dell', 'XPS 9520'),
('ThinkPad X1 Carbon', 2, '14" QHD+, i7, 32GB RAM', 'Business laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Lenovo', 'X1 Carbon Gen 11'),
('Razer Blade 18', 2, '18" QHD+, i9, 32GB RAM, RTX 4090', 'Gaming laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Razer', 'Blade 18'),
('Framework Laptop', 2, '13.5" 3:2, i7, 32GB RAM', 'Modular laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Framework', '13 DIY Edition'),
('LG Gram 17', 2, '17" QHD+, i7, 16GB RAM', 'Ultra-lightweight laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'LG', 'Gram 17'),
('Surface Laptop Studio', 2, '14.4" Touch, i7, 32GB RAM, RTX 4060', 'Convertible laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Microsoft', 'Surface Laptop Studio 2'),
('Alienware x17', 2, '17.3" UHD, i9, 64GB RAM, RTX 4090', 'Premium gaming laptop', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Laptops'), '/bookcover/default.jpg', 'Dell', 'Alienware x17 R3');

-- Insert accessories
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand, Model) VALUES 
('Pro Gaming Mouse', 2, '16000 DPI, RGB, Wireless', 'Professional gaming mouse', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Accessories'), '/bookcover/default.jpg', 'Logitech', 'G Pro X'),
('Noise-Canceling Headphones', 2, 'Bluetooth 5.0, 30h battery', 'Premium wireless headphones', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Accessories'), '/bookcover/default.jpg', 'Sony', 'WH-1000XM5'),
('Webcam Pro', 2, '4K, 60fps, HDR', 'Professional streaming webcam', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Accessories'), '/bookcover/default.jpg', 'Logitech', 'Brio 4K'),
('USB-C Hub', 2, '7-in-1, 4K@60Hz', 'Multi-port USB-C hub', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Accessories'), '/bookcover/default.jpg', 'Anker', '7-in-1 Hub'),
('External SSD', 2, '2TB, USB 3.2', 'Portable SSD drive', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Accessories'), '/bookcover/default.jpg', 'Samsung', 'T7 Shield');

-- Insert clothing (Men's Wear)
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('Wool Suit', 3, 'Size 38-48, Navy Blue', 'Classic wool suit for formal occasions', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Hugo Boss'),
('Leather Jacket', 3, 'Size S-XXL, Black', 'Classic leather motorcycle jacket', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'AllSaints'),
('Chino Pants', 3, 'Size 28-40, Khaki', 'Casual chino pants', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Dockers'),
('Oxford Shirt', 3, 'Size S-XXL, White', 'Classic cotton oxford shirt', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Ralph Lauren'),
('Cashmere Sweater', 3, 'Size S-XL, Gray', 'Luxury cashmere pullover', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Brooks Brothers'),
('Wool Coat', 3, 'Size S-XXL, Charcoal', 'Winter wool coat', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Burberry'),
('Silk Tie', 3, 'One Size, Blue Stripe', 'Pure silk tie', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Hermès'),
('Dress Shoes', 3, 'Size 7-13, Brown', 'Oxford dress shoes', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Allen Edmonds');

-- Insert clothing (Women's Wear)
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('Evening Gown', 3, 'Size XS-XL, Black', 'Elegant evening dress', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Vera Wang'),
('Blazer', 3, 'Size XS-XL, Navy', 'Professional blazer', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Theory'),
('Silk Blouse', 3, 'Size XS-XL, White', 'Pure silk blouse', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Equipment'),
('Pencil Skirt', 3, 'Size 0-14, Black', 'Classic pencil skirt', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'J.Crew'),
('Cashmere Cardigan', 3, 'Size XS-XL, Beige', 'Luxury cashmere cardigan', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Vince'),
('Wool Coat', 3, 'Size XS-XL, Camel', 'Winter wool coat', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Max Mara'),
('Designer Handbag', 3, 'Medium, Black', 'Leather designer bag', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Gucci'),
('Ankle Boots', 3, 'Size 5-11, Black', 'Leather ankle boots', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Stuart Weitzman'),
('Cocktail Dress', 3, 'Size XS-XL, Red', 'Elegant cocktail dress', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Self-Portrait');

-- Insert clothing (Children's Wear)
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('School Uniform Set', 3, 'Age 4-12, Navy', 'Complete school uniform', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Marks & Spencer'),
('Rain Jacket', 3, 'Age 2-12, Yellow', 'Waterproof rain jacket', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Hunter'),
('Sport Set', 3, 'Age 4-14, Blue', 'Athletic wear set', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Nike'),
('Party Dress', 3, 'Age 2-10, Pink', 'Special occasion dress', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Janie and Jack'),
('Denim Set', 3, 'Age 3-12, Blue', 'Jeans and jacket set', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'GAP Kids'),
('Winter Boots', 3, 'Size 10K-6Y, Brown', 'Warm winter boots', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Timberland'),
('Pajama Set', 3, 'Age 2-14, Various', 'Cotton pajama set', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Carter''s'),
('Swim Set', 3, 'Age 2-12, Blue', 'UV protection swimwear', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'Speedo'),
('School Backpack', 3, 'One Size, Various', 'Ergonomic school bag', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Children''s Wear'), '/bookcover/default.jpg', 'JanSport');

-- Insert furniture
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('Dining Table Set', 4, '6 Seats, Oak', 'Modern dining set with chairs', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'West Elm'),
('Queen Bed Frame', 4, '60x80 inches, Walnut', 'Platform bed frame', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Article'),
('Leather Armchair', 4, '35x38x38 inches, Brown', 'Classic leather armchair', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Pottery Barn'),
('TV Stand', 4, '65 inch, Black', 'Modern TV console', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'CB2'),
('Bookshelf', 4, '72x36x12 inches, White', '5-tier bookshelf', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Crate & Barrel'),
('Office Desk', 4, '60x30 inches, Oak', 'Home office desk', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Herman Miller'),
('Wardrobe', 4, '72x48x24 inches, White', 'Double door wardrobe', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'IKEA'),
('Coffee Table', 4, '48x24x18 inches, Glass', 'Modern coffee table', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'AllModern'),
('Storage Ottoman', 4, '24x24x18 inches, Gray', 'Storage ottoman with tray', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Wayfair');

-- Insert garden tools
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('Lawn Mower', 4, 'Electric, 20-inch', 'Cordless electric lawn mower', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'EGO'),
('Pruning Shears', 4, '8-inch, Bypass', 'Professional pruning shears', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'Felco'),
('Garden Hose', 4, '100ft, Expandable', 'Flexible garden hose', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'Flexzilla'),
('Leaf Blower', 4, 'Electric, 12-amp', 'Electric leaf blower', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'WORX'),
('Wheelbarrow', 4, '6 cubic ft, Steel', 'Heavy-duty wheelbarrow', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'True Temper'),
('Garden Spade', 4, '48-inch handle', 'D-handle garden spade', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'Fiskars'),
('Hedge Trimmer', 4, 'Electric, 22-inch', 'Cordless hedge trimmer', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'BLACK+DECKER'),
('Garden Fork', 4, '47-inch handle', 'Digging fork', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'Spear & Jackson'),
('Pressure Washer', 4, '2000 PSI', 'Electric pressure washer', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Garden Tools'), '/bookcover/default.jpg', 'Sun Joe');

-- Insert home decor
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES 
('Area Rug', 4, '8x10 ft, Wool', 'Persian-style area rug', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'Safavieh'),
('Wall Mirror', 4, '36-inch round', 'Modern round mirror', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'West Elm'),
('Table Lamp', 4, '26-inch, Ceramic', 'Modern table lamp', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'Pottery Barn'),
('Throw Pillows', 4, '20x20 inch, Set of 2', 'Decorative throw pillows', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'CB2'),
('Wall Art', 4, '40x60 inch', 'Abstract canvas print', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'Z Gallerie'),
('Curtains', 4, '84-inch, Linen', 'Blackout curtain panels', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'RH'),
('Floor Lamp', 4, '65-inch, Metal', 'Arc floor lamp', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'CB2'),
('Throw Blanket', 4, '50x60 inch, Cashmere', 'Luxury throw blanket', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'Pendleton'),
('Decorative Bowls', 4, 'Set of 3, Ceramic', 'Ceramic bowl set', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Home Decor'), '/bookcover/default.jpg', 'Crate & Barrel');

-- Additional Clothing Products
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES
('Wool Suit', 3, 'Size 38-46, Navy', 'Premium wool business suit', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Men''s Wear'), '/bookcover/default.jpg', 'Hugo Boss'),
('Evening Gown', 3, 'Size XS-XL, Black', 'Elegant evening gown', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Vera Wang'),
('Designer Handbag', 3, 'Leather, Medium', 'Luxury leather handbag', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Women''s Wear'), '/bookcover/default.jpg', 'Gucci');

-- Additional Furniture Products
INSERT INTO PRODUCT (Name, Type_ID, Specification, Description, Category_ID, Image_URL, Brand) VALUES
('Dining Table Set', 4, '6-seater, Oak', 'Modern dining set with chairs', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Ashley Furniture'),
('Queen Bed Frame', 4, '60x80 inches, Walnut', 'Queen size platform bed', (SELECT Category_ID FROM CATEGORIES WHERE Name_Type='Furniture'), '/bookcover/default.jpg', 'Pottery Barn');

-- Remove duplicate product
DELETE FROM PRODUCT WHERE Name = 'Queen Bed Frame' AND Product_ID > (
    SELECT MIN(Product_ID) FROM (
        SELECT Product_ID FROM PRODUCT WHERE Name = 'Queen Bed Frame'
    ) AS p
);

-- Clear any existing product-store relationships to avoid duplicates
DELETE FROM PRODUCT_STORE;

-- 6. Insert product-store relationships (depends on products and stores)
-- Premium electronics in specialized stores
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT DISTINCT
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN p.Name = 'iPhone 15 Pro' THEN 1199.99 + (RAND() * 100)
        WHEN p.Name = 'Galaxy S23 Ultra' THEN 1099.99 + (RAND() * 100)
        WHEN p.Name = 'Pixel 8 Pro' THEN 999.99 + (RAND() * 100)
    END as Price,
    5 + FLOOR(RAND() * 20) as Stock
FROM PRODUCT p
CROSS JOIN STORE s
WHERE p.Name IN ('iPhone 15 Pro', 'Galaxy S23 Ultra', 'Pixel 8 Pro')
AND s.Name IN ('Digital World', 'Smart Electronics', 'Tech Haven', 'Volos Electronics')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Connect Electronics products to electronics stores
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock) 
SELECT DISTINCT
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN c.Name_Type = 'Smartphones' THEN 800 + RAND() * 1000
        WHEN c.Name_Type = 'Laptops' THEN 1000 + RAND() * 2000
        WHEN c.Name_Type = 'Accessories' THEN 50 + RAND() * 200
    END as Price,
    10 + FLOOR(RAND() * 40) as Stock
FROM PRODUCT p
JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
CROSS JOIN (
    SELECT Store_ID FROM STORE 
    WHERE Name IN ('Digital World', 'Smart Electronics', 'Tech Haven', 'Volos Electronics')
) s
WHERE c.Name_Type IN ('Smartphones', 'Laptops', 'Accessories')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Connect all products to major retail stores with slightly higher prices
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT DISTINCT
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN c.Name_Type IN ('Smartphones', 'Laptops') THEN (1000 + RAND() * 2000) * 1.1
        WHEN c.Name_Type = 'Accessories' THEN (50 + RAND() * 200) * 1.1
        WHEN c.Name_Type LIKE '%Wear' THEN (50 + RAND() * 200) * 1.1
        WHEN c.Name_Type = 'Furniture' THEN (300 + RAND() * 1000) * 1.1
        WHEN c.Name_Type = 'Garden Tools' THEN (100 + RAND() * 400) * 1.1
        WHEN c.Name_Type = 'Home Decor' THEN (50 + RAND() * 200) * 1.1
        ELSE (20 + RAND() * 30) * 1.1
    END as Price,
    30 + FLOOR(RAND() * 70) as Stock
FROM PRODUCT p
JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
CROSS JOIN (
    SELECT Store_ID FROM STORE 
    WHERE Name IN ('Mega Store', 'Athens Books & Tech', 'Digital World')
) s
WHERE NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Connect clothing to fashion stores
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT DISTINCT
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN c.Name_Type LIKE '%Wear' THEN 50 + RAND() * 200
    END as Price,
    15 + FLOOR(RAND() * 30) as Stock
FROM PRODUCT p
JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
CROSS JOIN (
    SELECT Store_ID FROM STORE 
    WHERE Name IN ('Elite Fashion', 'Style Studio', 'Kids Kingdom', 'Ioannina Fashion')
) s
WHERE c.Name_Type IN ('Men''s Wear', 'Women''s Wear', 'Children''s Wear')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Connect home & garden products to respective stores
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT DISTINCT
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN c.Name_Type = 'Furniture' THEN 300 + RAND() * 1000
        WHEN c.Name_Type = 'Garden Tools' THEN 100 + RAND() * 400
        WHEN c.Name_Type = 'Home Decor' THEN 50 + RAND() * 200
    END as Price,
    5 + FLOOR(RAND() * 20) as Stock
FROM PRODUCT p
JOIN CATEGORIES c ON p.Category_ID = c.Category_ID
CROSS JOIN (
    SELECT Store_ID FROM STORE 
    WHERE Name IN ('Home Haven', 'Garden Glory', 'Decor Dreams', 'Rhodes Home Store')
) s
WHERE c.Name_Type IN ('Furniture', 'Garden Tools', 'Home Decor')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Add popular clothing items to more fashion stores with varying prices
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT 
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN p.Name = 'Wool Suit' THEN 399.99 + (RAND() * 100)
        WHEN p.Name = 'Evening Gown' THEN 299.99 + (RAND() * 100)
        WHEN p.Name = 'Designer Handbag' THEN 499.99 + (RAND() * 200)
    END as Price,
    2 + FLOOR(RAND() * 10) as Stock
FROM PRODUCT p
CROSS JOIN STORE s
WHERE p.Name IN ('Wool Suit', 'Evening Gown', 'Designer Handbag')
AND s.Name IN ('Elite Fashion', 'Style Studio', 'Ioannina Fashion')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- Add popular furniture to more home stores with varying prices
INSERT INTO PRODUCT_STORE (Product_ID, Store_ID, Price, Stock)
SELECT 
    p.Product_ID,
    s.Store_ID,
    CASE 
        WHEN p.Name = 'Modern Sofa Set' THEN 899.99 + (RAND() * 300)
        WHEN p.Name = 'Dining Table Set' THEN 799.99 + (RAND() * 200)
        WHEN p.Name = 'Queen Bed Frame' THEN 599.99 + (RAND() * 200)
    END as Price,
    1 + FLOOR(RAND() * 5) as Stock
FROM PRODUCT p
CROSS JOIN STORE s
WHERE p.Name IN ('Modern Sofa Set', 'Dining Table Set', 'Queen Bed Frame')
AND s.Name IN ('Home Haven', 'Rhodes Home Store', 'Decor Dreams')
AND NOT EXISTS (
    SELECT 1 FROM PRODUCT_STORE ps 
    WHERE ps.Product_ID = p.Product_ID AND ps.Store_ID = s.Store_ID
);

-- 7. Finally add the orders (depends on users, products, and stores)
INSERT INTO `ORDER` (User_ID, Product_ID, Store_ID, Quantity, Price, Total_Amount, Shipping_Address, Status, Date) VALUES
('seller1', 1, 1, 2, 99.99, 199.98, '123 Test St, Athens', 'delivered', CURRENT_TIMESTAMP),
('seller1', 2, 1, 1, 149.99, 149.99, '456 Test St, Athens', 'pending', CURRENT_TIMESTAMP);
