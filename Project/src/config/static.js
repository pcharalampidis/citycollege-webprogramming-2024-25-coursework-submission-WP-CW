const express = require('express');
const path = require('path');

function setupStatic(app) {
    // Serve static files from the public directory
    app.use(express.static(path.join(__dirname, '../public')));
}

module.exports = setupStatic;
