# Green Pulse Frontend

## Overview

The frontend component of Green Pulse provides a responsive web interface for visualizing energy consumption data, carbon metrics, and interacting with the blockchain-based energy trading platform. It's built with React and Chakra UI.

## Tech Stack

- **Framework**: React 18
- **UI Library**: Chakra UI
- **State Management**: React Context API
- **Routing**: React Router
- **HTTP Client**: Axios
- **Data Visualization**: ApexCharts
- **Form Handling**: React Hook Form

## Dependencies

- **@chakra-ui/react**: UI component library
- **@emotion/react** & **@emotion/styled**: CSS-in-JS styling
- **@tanstack/react-table**: Table management
- **apexcharts** & **react-apexcharts**: Data visualization
- **axios**: HTTP requests
- **react-router-dom**: Routing
- **react-calendar**: Calendar component
- **react-icons**: Icon library

## Project Structure

- **src/assets/**: Static assets like images and icons
- **src/components/**: Reusable UI components
- **src/contexts/**: React context providers
- **src/layouts/**: Page layout components
- **src/services/**: API service integrations
- **src/theme/**: Chakra UI theme customization
- **src/utils/**: Utility functions
- **src/variables/**: Global variables and constants
- **src/views/**: Page components

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode

```bash
npm start
```

This will start the development server on http://localhost:3000.

### Production Build

```bash
npm run build
```

This will create an optimized production build in the `build` directory.

## Features

- **Dashboard**: Overview of energy consumption and carbon metrics
- **Building Management**: View and manage building information
- **Energy Trading**: Interface for trading energy tokens
- **Alerts**: Notification system for energy usage anomalies
- **User Profile**: User account management

## Configuration

### Proxy Configuration

The frontend is configured to proxy API requests to the backend server running on port 5000. This is defined in the `package.json` file:

```json
{
  "proxy": "http://localhost:5000"
}
```

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

- `REACT_APP_API_URL`=http://localhost:5000/api
- `REACT_APP_CHATBOT_URL`=http://localhost:5001