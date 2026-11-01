# ZamBus Backend

Smart Digital Intercity Bus Management System - Backend API

## Overview

ZamBus is a comprehensive bus management platform that connects passengers, drivers, bus operators, and administrators. The backend provides RESTful APIs for managing routes, buses, trips, bookings, boarding, and emergency reporting.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Auth**: JWT + bcrypt

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/zambus
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
APP_NAME=ZamBus
PLATFORM_COMMISSION_RATE=0.10
```

### Database Setup

1. Create a PostgreSQL database named `zambus`
2. Run the seed script to populate with test data:

```bash
npx ts-node src/seed.ts
```

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will start at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/routes` | List all routes | ✓ |
| POST | `/api/routes` | Create route (Operator) | ✓ |
| GET | `/api/routes/:id` | Get route details | ✓ |
| PUT | `/api/routes/:id` | Update route (Operator) | ✓ |
| DELETE | `/api/routes/:id` | Delete route (Operator) | ✓ |

### Buses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/buses` | List all buses | ✓ |
| POST | `/api/buses` | Create bus (Operator) | ✓ |
| GET | `/api/buses/:id` | Get bus details | ✓ |
| PUT | `/api/buses/:id` | Update bus (Operator) | ✓ |
| DELETE | `/api/buses/:id` | Delete bus (Operator) | ✓ |

### Trips

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/trips` | Search/list trips | ✓ |
| POST | `/api/trips` | Create trip (Operator) | ✓ |
| GET | `/api/trips/:id` | Get trip details | ✓ |
| PUT | `/api/trips/:id` | Update trip (Operator) | ✓ |
| POST | `/api/trips/:id/start` | Start trip (Driver) | ✓ |
| POST | `/api/trips/:id/complete` | Complete trip (Driver) | ✓ |
| POST | `/api/trips/:id/cancel` | Cancel trip (Operator) | ✓ |

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/bookings` | List user's bookings | ✓ |
| POST | `/api/bookings` | Create booking (Passenger) | ✓ |
| GET | `/api/bookings/:id` | Get booking details | ✓ |
| POST | `/api/bookings/:id/confirm` | Confirm payment (Passenger) | ✓ |
| POST | `/api/bookings/:id/cancel` | Cancel booking (Passenger) | ✓ |

### Boarding

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/boarding/scan` | Scan QR ticket (Driver) | ✓ |
| POST | `/api/boarding/mark` | Mark passenger boarded (Driver) | ✓ |
| GET | `/api/boarding/manifest` | Get trip manifest (Driver) | ✓ |

### Emergency Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/emergency` | Report emergency (Driver) | ✓ |
| GET | `/api/emergency` | List emergencies (Admin) | ✓ |
| PUT | `/api/emergency/:id` | Update emergency (Admin) | ✓ |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | ✓ (Admin) |
| PUT | `/api/admin/users/:id/role` | Update user role | ✓ (Admin) |
| PUT | `/api/admin/commission` | Update commission rate | ✓ (Admin) |
| GET | `/api/admin/companies` | List bus companies | ✓ (Admin) |
| PUT | `/api/admin/companies/:id/approve` | Approve company | ✓ (Admin) |

### Exports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/exports/manifest` | Export trip manifest (PDF/Excel) | ✓ |
| GET | `/api/exports/revenue` | Export revenue report | ✓ |

## Login Credentials

Use these pre-configured accounts to test the API:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@zambus.com` | `admin123` |
| **Operator** | `operator@zambus.com` | `operator123` |
| **Driver** | `driver@zambus.com` | `driver123` |
| **Passenger** | `passenger@zambus.com` | `passenger123` |
| **Passenger** | `mike@zambus.com` | `passenger123` |

### Example Login Request

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@zambus.com",
    "password": "admin123"
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid-here",
      "fullName": "Admin User",
      "email": "admin@zambus.com",
      "role": "ADMIN"
    },
    "token": "jwt-token-here"
  }
}
```

## Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app setup
│   ├── config/
│   │   ├── index.ts        # Configuration
│   │   └── database.ts     # Database connection
│   ├── controllers/        # Request handlers
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Helpers (JWT, password, schemas)
│   └── seed.ts             # Database seed script
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access, manage users, approve companies, view reports |
| **OPERATOR** | Manage company (buses, routes, trips), view bookings |
| **DRIVER** | Start/complete trips, scan tickets, report emergencies |
| **PASSENGER** | Search trips, book tickets, view bookings, cancel bookings |

## License

Private - ZamBus Development Team
