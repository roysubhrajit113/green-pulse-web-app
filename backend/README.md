# Green Pulse Backend

## Overview

The backend component of Green Pulse provides a RESTful API for managing energy data, user authentication, alerts, and blockchain integration. It's built with Node.js, Express, and MongoDB.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, helmet, express-rate-limit

## Dependencies

- **bcryptjs**: Password hashing
- **cors**: Cross-Origin Resource Sharing
- **dotenv**: Environment variable management
- **express**: Web framework
- **express-rate-limit**: API rate limiting
- **helmet**: Security headers
- **jsonwebtoken**: JWT authentication
- **mongoose**: MongoDB object modeling
- **node-fetch**: HTTP requests

## Project Structure

- **config/**: Database and authentication configuration
- **controllers/**: Request handlers for different resources
- **middleware/**: Authentication and validation middleware
- **models/**: Mongoose data models
- **routes/**: API route definitions
- **scripts/**: Data population and utility scripts
- **services/**: Business logic and external service integration
- **utils/**: Utility functions

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/greenpulse
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate user and get token

### Institutes

- `GET /api/institutes`: Get all institutes
- `GET /api/institutes/:id`: Get institute by ID

### Carbon Data

- `GET /api/carbon-data`: Get carbon data
- `POST /api/carbon-data`: Create new carbon data entry

### Alerts

- `GET /api/alerts`: Get all alerts
- `POST /api/alerts`: Create a new alert

### Buildings

- `GET /api/buildings`: Get all buildings
- `GET /api/buildings/:id`: Get building by ID

### Meter Data

- `GET /api/meter-data`: Get meter data
- `POST /api/meter-data`: Submit new meter data

### Wallet

- `GET /api/wallet`: Get wallet information
- `POST /api/wallet/transaction`: Create a new transaction

## Docker Deployment

The backend can be deployed as part of the complete Green Pulse application using Docker:

```bash
# From the project root directory
docker-compose up -d
```

## Scripts

- `populate-sample-data.js`: Populate the database with sample data
- `checkAlerts.js`: Check and process alerts
- `seedCarbonData.js`: Seed carbon data for testing

## Configuration

### Database Configuration

The database connection is configured in `config/database.js` and uses the MongoDB URI specified in the environment variables.

### Authentication Configuration

JWT authentication is configured in `config/auth.js` and `middleware/auth.js`.