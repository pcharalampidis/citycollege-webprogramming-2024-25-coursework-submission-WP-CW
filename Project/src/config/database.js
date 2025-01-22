// Setup our database conection pool - change settings in .env file
const mysql = require('mysql2');
require('dotenv').config();

// main database configuration 
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'SkroutzDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// convert regular pool to one that uses promises (makes async/await work)
const promisePool = pool.promise();

// export the promise pool so other files can use it
module.exports = promisePool;
