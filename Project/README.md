# E-commerce Web Application

A RESTful API built with Node.js, Express, and MySQL, containerized with Docker.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Clone the repository
2. Create a `.env` file based on the provided example
3. Build and run the containers:

```bash
docker-compose up --build
```

The application will be available at http://localhost:3000

## API Endpoints

### Users
- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- POST /api/users - Create new user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user

More endpoints for products, stores, orders, and reviews will be implemented similarly.

## Database

The application uses MySQL with the following main tables:
- USER
- CATEGORIES
- STORE
- PRODUCT
- USER_FAVORITES
- ORDER
- REVIEW
- STORE_PRODUCT

## Development

To run in development mode with hot reloading:

```bash
docker-compose -f docker-compose.yml up --build
```
