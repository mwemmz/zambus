# ZamBus - Technical Specification Document

**Project:** ZamBus – Smart Digital Intercity Bus Management System for Zambia
**Document Type:** Technical Specification (Phase 1 - Prototype)
**Version:** 1.0
**Date:** September 7, 2026

---

## 1. Executive Summary

ZamBus is a digital platform for the Zambian intercity transport sector that bridges passengers, bus operators, and onboard conductors. The system digitizes seat reservations, mobile ticketing, QR-based boarding, live trip monitoring, and financial settlement.

**Scope:** Phase 1 prototype with core functionality across all user roles, using mocked payment gateway and simplified QR codes.

---

## 2. Technology Stack

### 2.1 Mobile Application (Flutter)

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | Flutter (Dart) | Single codebase for iOS & Android |
| State Management | **Bloc/Cubit** | Explicit event/state patterns for complex flows |
| Architecture | Clean Architecture (presentation → domain → data) | Separation of concerns |
| QR Scanning | `mobile_scanner` or `qr_code_scanner` package | Camera-based QR scanning |
| QR Generation | `qr_flutter` package | Display tickets with QR codes |
| Local Storage | `shared_preferences` + `hive` or `sqflite` | Simple cached manifest for conductors |
| HTTP Client | `dio` | API communication with interceptors |
| Auth Storage | `flutter_secure_storage` | Secure token storage |
| Maps | `google_maps_flutter` or `flutter_map` with OpenStreetMap tiles | OpenStreetMaps as requested |
| Images/Assets | Standard Flutter assets | App icon, splash screen, bus seat layouts |

### 2.2 Backend (Node.js)

| Component | Technology | Notes |
|-----------|------------|-------|
| Runtime | Node.js with TypeScript | Type safety across backend |
| Framework | **Express.js** | MVC-style structure (controllers, models, routes) |
| Database ORM | **Prisma** or **Sequelize** | PostgreSQL integration (TBD based on preference) |
| Authentication | JWT (jsonwebtoken) + bcrypt | Password hashing with salt factor >= 10 |
| Validation | `zod` or `joi` | Request validation |
| QR Generation | `qrcode` package | Generate QR code data (no cryptographic signing for Phase 1) |
| File Exports | `pdfkit` + `exceljs` | PDF/Excel manifest exports |
| Email | Nodemailer (placeholder) | For password reset, notifications (mocked) |

### 2.3 Database

| Component | Technology | Notes |
|-----------|------------|-------|
| Primary DB | **PostgreSQL** | Relational data integrity |
| PostGIS | **Not included in Phase 1** | Deferred to production phase |
| Caching | **None for Phase 1** | Redis deferred; use DB locks for seat concurrency |
| Real-time | **None for Phase 1** | Polling + DB locks instead of WebSockets |

### 2.4 Infrastructure

| Component | Approach |
|-----------|----------|
| Containerization | **None** - Run directly on host machine |
| Deployment Target | Development server / local machine |
| Environment Config | `.env` files with dotenv package |

---

## 3. User Roles & Authentication

### 3.1 Roles

| Role | Code | Description |
|------|------|-------------|
| Passenger | `PASSENGER` | Searches routes, books seats, pays, scans QR for boarding |
| Driver/Conductor | `DRIVER` | Scans passenger QR codes, manages manifest, reports emergencies |
| Bus Operator (Company Admin) | `OPERATOR` | Manages fleet, routes, schedules, views revenue analytics |
| System Administrator | `ADMIN` | Onboards bus companies, manages users, configures platform settings |

### 3.2 Authentication Approach

**Phase 1: Email/Password only**

- Users register with email, password, full name, and phone number
- Login returns JWT access token (stored securely on device)
- Password hashing: bcrypt with salt factor >= 10
- Token-based session management with automatic refresh logic
- OTP/SMS authentication deferred to production phase

**Registration Flow:**
1. User enters email, password, full name, phone number
2. Backend validates and creates user account
3. Backend returns success with user profile
4. User is logged in automatically

**Login Flow:**
1. User enters email and password
2. Backend validates credentials
3. Backend returns JWT token + user profile
4. App stores token and navigates to role-appropriate home screen

---

## 4. Application Architecture - Single App with Role-Based UI

### 4.1 App Structure

**Single Flutter app** that presents different interfaces based on user role after authentication.

```
lib/
├── main.dart
├── core/
│   ├── theme/
│   ├── constants/
│   ├── utils/
│   ├── DI/ (dependency injection)
│   └── router/ (navigation)
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
├── presentation/
│   ├── bloc/ (or cubit)
│   ├── pages/
│   └── widgets/
└── features/
    ├── auth/
    ├── passenger/
    ├── driver/
    ├── operator/
    └── admin/
```

### 4.2 Role-Based Navigation

After login, the app determines the user's role and presents the appropriate home dashboard:

- **Passenger** → Passenger home (route search, bookings, ticket wallet)
- **Driver/Conductor** → Driver home (QR scanner, manifest, emergency button)
- **Operator** → Operator home (fleet management, analytics, trip controls)
- **Admin** → Admin home (company approvals, system settings, user management)

---

## 5. Feature Specifications

### 5.1 Authentication Module (All Roles)

#### Requirements

| ID | Description |
|----|-------------|
| AUTH-001 | Email/password registration with validation |
| AUTH-002 | Email/password login with JWT token return |
| AUTH-003 | Secure token storage on device |
| AUTH-004 | Role-based redirect after login |
| AUTH-005 | Logout functionality |
| AUTH-006 | Password hashing with bcrypt (salt >= 10) |

#### API Endpoints

```
POST   /api/auth/register     - Create new account
POST   /api/auth/login        - Login and receive JWT
POST   /api/auth/logout       - Invalidate session (optional for Phase 1)
GET    /api/auth/me           - Get current user profile
PUT    /api/auth/profile      - Update profile (name, phone)
```

---

### 5.2 Passenger Features

#### 5.2.1 Home Dashboard & Route Search

**Requirements:**

| ID | Description |
|----|-------------|
| PAS-001 | Search trips by origin, destination, travel date |
| PAS-002 | Display real-time trip cards: operator, bus category, times, price, seats remaining |
| PAS-003 | Filter by: lowest price, earliest departure, bus category (Luxury, Semi-Luxury, Standard) |
| PAS-004 | View trip details before booking |

**UI Flow:**
```
[Search Screen] → [Results List/Grid] → [Trip Details] → [Seat Selection]
```

**Trip Card Display:**
- Operator name & logo
- Bus category badge (Luxury / Semi-Luxury / Standard)
- Departure time & arrival time
- Origin → Destination
- Unit price
- Remaining seats count
- Bus registration number

#### 5.2.2 Seat Selection

**Requirements:**

| ID | Description |
|----|-------------|
| PAS-005 | Visual 2D bus seat layout display |
| PAS-006 | Seat colors: Green (available), Red (occupied/paid), Yellow (held) |
| PAS-007 | Select seat and proceed to booking review |
| PAS-008 | **Seat Concurrency:** DB-level row locks to prevent double-booking |
| PAS-009 | **No Redis locks for Phase 1** - use PostgreSQL transactions/row locking |

**Seat Layout:**
- Visual representation of bus seating
- Each seat is tappable
- Color-coded by availability status
- Selected seat is highlighted

#### 5.2.3 Booking Review & Payment

**Requirements:**

| ID | Description |
|----|-------------|
| PAS-010 | Review booking details before payment |
| PAS-011 | **Mocked payment:** Simple "Confirm Payment" button |
| PAS-012 | No payment method selection UI for Phase 1 |
| PAS-013 | On "confirm," booking is created with CONFIRMED status |
| PAS-014 | Generate QR code ticket after payment confirmation |

**Booking Review Screen Shows:**
- Selected seat number
- Route (origin → destination)
- Bus details (registration, category)
- Departure time
- Passenger name
- Total price
- "Confirm Payment" button

#### 5.2.4 QR Ticket Display

**Requirements:**

| ID | Description |
|----|-------------|
| PAS-015 | Display ticket with QR code after successful booking |
| PAS-016 | QR code contains: Ticket ID, Passenger Name, Seat Number, Route, Bus Reg, Departure Time, Boarding Status |
| PAS-017 | **No HMAC signing for Phase 1** - simple encoded JSON payload |
| PAS-018 | High-contrast QR for easy scanning |
| PAS-019 | Offline-accessible ticket info displayed on screen |
| PAS-020 | Ticket stored in app for future reference |

**Ticket Display:**
```
┌─────────────────────────────────┐
│  ZAMBUS TICKET                  │
│  ─────────────────────────────  │
│  Ticket ID: ABC-12345           │
│  Passenger: John Doe            │
│  Seat: 12A                      │
│  Route: Lusaka → Livingstone    │
│  Bus: BCA-123                   │
│  Departure: 2026-09-10 08:00   │
│  Status: NOT_BOARDED            │
│  ─────────────────────────────  │
│  [QR CODE]                      │
│  ─────────────────────────────  │
│  Show this ticket to conductor  │
└─────────────────────────────────┘
```

#### 5.2.5 My Bookings / Ticket Wallet

**Requirements:**

| ID | Description |
|----|-------------|
| PAS-021 | View all passenger's bookings |
| PAS-022 | Show booking status (NOT_BOARDED, BOARDED, DROPPED_OFF, CANCELLED) |
| PAS-023 | Access historical tickets |

---

### 5.3 Driver/Conductor Features

#### 5.3.1 QR Code Scanning

**Requirements:**

| ID | Description |
|----|-------------|
| DRV-001 | Camera-based QR scanner using device camera |
| DRV-002 | Scan ticket QR code |
| DRV-003 | Validate against backend manifest |
| DRV-004 | Display validation feedback: Valid (mark as boarded), Duplicate/Used, Invalid Route/Date |
| DRV-005 | Visual + auditory feedback on scan result |
| DRV-006 | **Simple cached manifest:** Download manifest before trip, scan offline |
| DRV-007 | No complex offline sync conflict resolution for Phase 1 |

**Scan Feedback:**

| Result | Visual | Auditory |
|--------|--------|----------|
| ✅ Valid - Mark as Boarded | Green checkmark, success animation | Success beep |
| ⚠️ Duplicate / Already Used | Yellow warning, shows previous scan time | Warning tone |
| ❌ Invalid Route / Wrong Date | Red X, shows expected vs actual | Error buzz |

#### 5.3.2 Passenger Manifest

**Requirements:**

| ID | Description |
|----|-------------|
| DRV-008 | View real-time passenger manifest sorted by seat number |
| DRV-009 | Show boarding status per passenger |
| DRV-010 | Show drop-off status per passenger |
| DRV-011 | Download/refresh manifest before trip departure |
| DRV-012 | **Offline-capable:** Manifest cached locally for offline scanning |

**Manifest Display:**
```
┌─────────────────────────────────┐
│  Trip: Lusaka → Livingstone     │
│  Bus: BCA-123  Date: 2026-09-10 │
│  ─────────────────────────────  │
│  Seat  │ Passenger    │ Status  │
│  ─────────────────────────────  │
│  1A    │ John Doe     │ ✅ Boarded│
│  1B    │ Jane Smith   │ ⏳ Pending│
│  2A    │ Bob Wilson   │ ⏳ Pending│
│  ...                              │
└─────────────────────────────────┘
```

#### 5.3.3 Drop-off Alerts

**Requirements:**

| ID | Description |
|----|-------------|
| DRV-013 | Alert conductors to upcoming passenger drop-off points |
| DRV-014 | Show next stop and passengers to drop off there |

#### 5.3.4 Emergency Reporting

**Requirements:**

| ID | Description |
|----|-------------|
| DRV-015 | One-touch emergency triggers: Breakdown, Accident, Severe Delay |
| DRV-016 | Send emergency alert to backend (and eventually to passengers/ops center) |
| DRV-017 | Show confirmation after emergency report |

**Emergency Types:**
- 🚗 Breakdown
- ⚠️ Accident
- ⏰ Severe Delay

---

### 5.4 Operator Features (Full Suite)

#### 5.4.1 Fleet Management

**Requirements:**

| ID | Description |
|----|-------------|
| OPR-001 | Register bus profiles |
| OPR-002 | Edit bus details |
| OPR-003 | View fleet list |
| OPR-004 | Set maintenance status per bus |
| OPR-005 | Delete/archive buses |

**Bus Profile Fields:**
- Registration Number (unique)
- Model (e.g., Toyota Coaster, Hino)
- Seat Capacity (number)
- Amenities (multi-select: AC, Wi-Fi, Toilet, TV, etc.)
- Maintenance Status (Operational, Maintenance, Out of Service)
- Photo (optional for Phase 1)

#### 5.4.2 Route Management

**Requirements:**

| ID | Description |
|----|-------------|
| OPR-006 | Create routes with origin, destination, intermediate stops |
| OPR-007 | Edit existing routes |
| OPR-008 | View all routes |
| OPR-009 | Delete routes (if no scheduled trips) |

**Route Fields:**
- Route name (e.g., "Lusaka - Livingstone")
- Origin city/location
- Destination city/location
- Intermediate stops (list of waypoints)
- Estimated travel time

#### 5.4.3 Trip Schedule Management

**Requirements:**

| ID | Description |
|----|-------------|
| OPR-010 | Create trip schedules |
| OPR-011 | Assign bus to trip |
| OPR-012 | Assign driver to trip |
| OPR-013 | Set fare amount |
| OPR-014 | Set departure and arrival times |
| OPR-015 | Create recurring or one-off trips |
| OPR-016 | Edit scheduled trips |
| OPR-017 | View all scheduled trips |
| OPR-018 | **Master overrides:** Open, close, delay, or cancel active trips |

**Trip Schedule Fields:**
- Route reference
- Bus reference
- Driver reference
- Departure datetime
- Estimated arrival datetime
- Fare amount (currency)
- Status: SCHEDULED, BOARDING, IN_TRANSIT, COMPLETED, CANCELLED
- Is recurring flag + recurrence pattern (if applicable)

#### 5.4.4 Revenue & Analytics Dashboard

**Requirements:**

| ID | Description |
|----|-------------|
| OPR-019 | Display total revenue (all time / period filter) |
| OPR-020 | Display average occupancy rate per route |
| OPR-021 | Display commission deductions |
| OPR-022 | Display net payouts |
| OPR-023 | Period filtering (today, week, month, custom range) |
| OPR-024 | Visual charts/graphs for revenue trends |

**Analytics Display:**
```
┌─────────────────────────────────────────────────┐
│  REVENUE DASHBOARD                              │
│  Period: [Today ▼]                              │
│  ─────────────────────────────────────────────  │
│  Total Revenue:    K 15,400.00                  │
│  Commission (10%): K 1,540.00                  │
│  Net Payout:       K 13,860.00                  │
│  ─────────────────────────────────────────────  │
│  Occupancy by Route:                            │
│  Lusaka→Livingstone: 85%                        │
│  Lusaka→Ndola: 62%                              │
│  ─────────────────────────────────────────────  │
│  [Revenue Chart - Line Graph]                   │
└─────────────────────────────────────────────────┘
```

#### 5.4.5 Manifest Export

**Requirements:**

| ID | Description |
|----|-------------|
| OPR-025 | Export passenger manifest as PDF |
| OPR-026 | Export passenger manifest as Excel |
| OPR-027 | Export before bus departure for terminal clearance |
| OPR-028 | Include: passenger names, seat numbers, contact info, ticket IDs |

---

### 5.5 Admin Features

#### 5.5.1 Bus Company Onboarding

**Requirements:**

| ID | Description |
|----|-------------|
| ADM-001 | Review pending bus company registrations |
| ADM-002 | Approve/reject bus operator accounts |
| ADM-003 | View operator details before approval |

#### 5.5.2 System Administration

**Requirements:**

| ID | Description |
|----|-------------|
| ADM-004 | View all users |
| ADM-005 | Manage user roles/permissions |
| ADM-006 | Configure platform commission rate |
| ADM-007 | View system-wide metrics (total bookings, active trips, etc.) |

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────────┐       1:N         ┌─────────────────┐
│  Bus Company    │───────────────────►│      Bus        │
│  (users.role=  │                   │                 │
│   OPERATOR)     │                   │                 │
└────────┬────────┘                   └────────┬────────┘
         │ 1:N                                  │ 1:N
         ▼                                      ▼
┌─────────────────┐       1:N         ┌─────────────────┐
│     Route       │───────────────────►│     Trip        │
└─────────────────┘                   │                 │
                                      └────────┬────────┘
                                               │ 1:N
                                               ▼
┌─────────────────┐       1:N         ┌─────────────────┐
│   Passenger     │───────────────────►│    Booking      │
│  (users.role=   │                   │                 │
│   PASSENGER)    │                   │                 │
└─────────────────┘                   └─────────────────┘
```

### 6.2 Table Definitions

```sql
-- Users table (Passengers, Drivers, Operators, Admins)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bus Companies (linked to OPERATOR users)
CREATE TABLE bus_companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(15),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buses
CREATE TABLE buses (
    bus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES bus_companies(company_id) ON DELETE CASCADE,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    seat_capacity INT NOT NULL CHECK (seat_capacity > 0),
    amenities TEXT[], -- Array of strings: {AC, WiFi, Toilet, TV, etc.}
    maintenance_status VARCHAR(20) DEFAULT 'OPERATIONAL' 
        CHECK (maintenance_status IN ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes
CREATE TABLE routes (
    route_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES bus_companies(company_id) ON DELETE CASCADE,
    route_name VARCHAR(150) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    intermediate_stops TEXT[], -- Array of stop names
    estimated_travel_time INT, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips (scheduled journeys)
CREATE TABLE trips (
    trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(bus_id),
    route_id UUID REFERENCES routes(route_id),
    driver_id UUID REFERENCES users(user_id), -- DRIVER role
    departure_time TIMESTAMP NOT NULL,
    estimated_arrival TIMESTAMP NOT NULL,
    fare_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- e.g., 'DAILY', 'WEEKLY', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings (individual seat reservations)
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(trip_id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    seat_number INT NOT NULL,
    qr_code_data TEXT NOT NULL, -- Encoded JSON with ticket details (no HMAC for Phase 1)
    payment_status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (payment_status IN ('PENDING', 'CONFIRMED', 'REFUNDED')),
    boarding_status VARCHAR(20) DEFAULT 'NOT_BOARDED' 
        CHECK (boarding_status IN ('NOT_BOARDED', 'BOARDED', 'DROPPED_OFF')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, seat_number) -- Prevent duplicate seat bookings
);

-- Emergency reports
CREATE TABLE emergency_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(trip_id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    emergency_type VARCHAR(20) NOT NULL 
        CHECK (emergency_type IN ('BREAKDOWN', 'ACCIDENT', 'SEVERE_DELAY')),
    description TEXT,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_trips_departure ON trips(departure_time);
CREATE INDEX idx_trips_route ON trips(route_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_seat ON bookings(trip_id, seat_number);
```

---

## 7. API Specification

### 7.1 Authentication

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/api/auth/register` | Register new user | `{full_name, email, phone_number, password, role?}` | `{user, token}` |
| POST | `/api/auth/login` | Login user | `{email, password}` | `{user, token}` |
| GET | `/api/auth/me` | Get current user | - | `{user}` |
| PUT | `/api/auth/profile` | Update profile | `{full_name?, phone_number?}` | `{user}` |

### 7.2 Routes (Operator)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | List all routes (filtered by company if operator) |
| POST | `/api/routes` | Create new route |
| GET | `/api/routes/:id` | Get route details |
| PUT | `/api/routes/:id` | Update route |
| DELETE | `/api/routes/:id` | Delete route |

### 7.3 Buses (Operator)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buses` | List all buses (filtered by company) |
| POST | `/api/buses` | Register new bus |
| GET | `/api/buses/:id` | Get bus details |
| PUT | `/api/buses/:id` | Update bus |
| DELETE | `/api/buses/:id` | Delete/archive bus |

### 7.4 Trips (Operator + Public Read)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips` | Search trips (public: filter by origin, destination, date) |
| POST | `/api/trips` | Create scheduled trip (operator) |
| GET | `/api/trips/:id` | Get trip details |
| PUT | `/api/trips/:id` | Update trip (operator) |
| POST | `/api/trips/:id/open` | Open trip for boarding (operator override) |
| POST | `/api/trips/:id/close` | Close trip (operator override) |
| POST | `/api/trips/:id/delay` | Delay trip with new time (operator override) |
| POST | `/api/trips/:id/cancel` | Cancel trip (operator override) |
| GET | `/api/trips/:id/manifest` | Get manifest for trip (driver/operator) |

### 7.5 Bookings (Passenger)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking (selects seat, locks it) |
| GET | `/api/bookings/my` | Get passenger's bookings |
| GET | `/api/bookings/:id` | Get booking details + QR data |
| POST | `/api/bookings/:id/confirm` | Confirm payment (mock) |
| POST | `/api/bookings/:id/cancel` | Cancel booking (if not yet boarded) |

### 7.6 Boarding (Driver)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/boarding/scan` | Validate scanned QR ticket |
| POST | `/api/boarding/:bookingId/board` | Mark passenger as boarded |
| POST | `/api/boarding/:bookingId/dropoff` | Mark passenger as dropped off |
| GET | `/api/boarding/manifest/:tripId` | Get full manifest for trip |

### 7.7 Emergency (Driver)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emergency` | Report emergency (breakdown, accident, delay) |

### 7.8 Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/companies` | List all bus companies pending approval |
| POST | `/api/admin/companies/:id/approve` | Approve bus company |
| POST | `/api/admin/companies/:id/reject` | Reject bus company |
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/:id/role` | Change user role |
| GET | `/api/admin/analytics` | System-wide analytics |
| PUT | `/api/admin/settings/commission` | Update platform commission rate |

### 7.9 Exports (Operator)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exports/manifest/:tripId/pdf` | Download manifest as PDF |
| GET | `/api/exports/manifest/:tripId/excel` | Download manifest as Excel |

---

## 8. Backend Architecture

### 8.1 Project Structure (MVC Style)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── cors.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── BusCompany.ts
│   │   ├── Bus.ts
│   │   ├── Route.ts
│   │   ├── Trip.ts
│   │   ├── Booking.ts
│   │   └── EmergencyReport.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── routes.controller.ts
│   │   ├── buses.controller.ts
│   │   ├── trips.controller.ts
│   │   ├── bookings.controller.ts
│   │   ├── boarding.controller.ts
│   │   ├── emergency.controller.ts
│   │   ├── admin.controller.ts
│   │   └── exports.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── routes.routes.ts
│   │   ├── buses.routes.ts
│   │   ├── trips.routes.ts
│   │   ├── bookings.routes.ts
│   │   ├── boarding.routes.ts
│   │   ├── emergency.routes.ts
│   │   ├── admin.routes.ts
│   │   └── exports.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   ├── qr.service.ts
│   │   └── export.service.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── response.ts
│   └── app.ts
├── prisma/
│   └── schema.prisma
├── .env
├── package.json
└── tsconfig.json
```

### 8.2 Key Implementation Notes

**Seat Concurrency (No Redis):**
- Use PostgreSQL transactions with row-level locks
- When booking: `SELECT ... FOR UPDATE` on the seat row
- This prevents race conditions without Redis

**QR Code (No HMAC):**
- Generate QR code data as simple JSON string
- Encode: `{booking_id, passenger_name, seat_number, route, bus_reg, departure_time, boarding_status}`
- No cryptographic signing for Phase 1

**Polling instead of WebSockets:**
- Frontend polls for updates where real-time is needed
- Example: seat availability refreshes on interval during booking
- Simpler architecture for Phase 1

**Offline Manifest (Simple):**
- Conductor downloads manifest as JSON before trip
- Store in local storage (Hive/SQLite)
- Scan against local cache
- No complex sync conflict resolution

---

## 9. Flutter Project Structure

```
zambus_mobile/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_colors.dart
│   │   │   ├── app_strings.dart
│   │   │   └── api_constants.dart
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   ├── utils/
│   │   │   ├── validators.dart
│   │   │   └── formatters.dart
│   │   ├── network/
│   │   │   ├── api_client.dart
│   │   │   ├── api_constants.dart
│   │   │   └── interceptors.dart
│   │   └── router/
│   │       └── app_router.dart
│   ├── data/
│   │   ├── datasources/
│   │   │   └── api_datasource.dart
│   │   ├── models/
│   │   │   ├── user_model.dart
│   │   │   ├── bus_model.dart
│   │   │   ├── route_model.dart
│   │   │   ├── trip_model.dart
│   │   │   ├── booking_model.dart
│   │   │   └── manifest_model.dart
│   │   └── repositories/
│   │       ├── auth_repository.dart
│   │       ├── route_repository.dart
│   │       ├── bus_repository.dart
│   │       ├── trip_repository.dart
│   │       ├── booking_repository.dart
│   │       └── boarding_repository.dart
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.dart
│   │   │   ├── bus.dart
│   │   │   ├── route.dart
│   │   │   ├── trip.dart
│   │   │   └── booking.dart
│   │   └── repositories/
│   │       └── (repository interfaces)
│   ├── presentation/
│   │   ├── cubit/
│   │   │   ├── auth/
│   │   │   │   ├── auth_cubit.dart
│   │   │   │   └── auth_state.dart
│   │   │   ├── booking/
│   │   │   ├── trip/
│   │   │   └── manifest/
│   │   ├── pages/
│   │   │   ├── splash/
│   │   │   ├── auth/
│   │   │   │   ├── login_page.dart
│   │   │   │   └── register_page.dart
│   │   │   ├── passenger/
│   │   │   │   ├── passenger_home.dart
│   │   │   │   ├── search_page.dart
│   │   │   │   ├── trip_details_page.dart
│   │   │   │   ├── seat_selection_page.dart
│   │   │   │   ├── booking_review_page.dart
│   │   │   │   ├── ticket_page.dart
│   │   │   │   └── my_bookings_page.dart
│   │   │   ├── driver/
│   │   │   │   ├── driver_home.dart
│   │   │   │   ├── qr_scanner_page.dart
│   │   │   │   ├── manifest_page.dart
│   │   │   │   ├── dropoff_alerts_page.dart
│   │   │   │   └── emergency_page.dart
│   │   │   ├── operator/
│   │   │   │   ├── operator_home.dart
│   │   │   │   ├── fleet_management/
│   │   │   │   │   ├── buses_list_page.dart
│   │   │   │   │   └── bus_form_page.dart
│   │   │   │   ├── route_management/
│   │   │   │   │   ├── routes_list_page.dart
│   │   │   │   │   └── route_form_page.dart
│   │   │   │   ├── trip_management/
│   │   │   │   │   ├── trips_list_page.dart
│   │   │   │   │   ├── trip_form_page.dart
│   │   │   │   │   └── trip_actions_dialog.dart
│   │   │   │   └── analytics/
│   │   │   │       └── revenue_dashboard_page.dart
│   │   │   └── admin/
│   │   │       ├── admin_home.dart
│   │   │       ├── companies_page.dart
│   │   │       ├── users_page.dart
│   │   │       └── settings_page.dart
│   │   └── widgets/
│   │       ├── common/
│   │       │   ├── app_button.dart
│   │       │   ├── app_input.dart
│   │       │   ├── loading_indicator.dart
│   │       │   └── error_display.dart
│   │       ├── seats/
│   │       │   ├── seat_widget.dart
│   │       │   └── bus_layout.dart
│   │       ├── tickets/
│   │       │   └── ticket_card.dart
│   │       └── maps/
│   │           └── route_map_widget.dart
│   └── injection_container.dart
├── assets/
│   ├── images/
│   │   ├── splash.png
│   │   ├── app_icon.png
│   │   └── bus_seat_layout.png
│   └── fonts/
├── test/
├── pubspec.yaml
└── ...
```

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Aspect | Target | Approach |
|--------|--------|----------|
| API Response Time | <= 200ms | Proper indexing, efficient queries |
| Mobile Memory | < 150MB | Efficient state management, lazy loading |
| Concurrency | 2,000 concurrent users (target) | DB connection pooling, efficient locking |

### 10.2 Security

| Aspect | Implementation |
|--------|----------------|
| Data Transmission | Enforce HTTPS in production (localhost HTTP for dev) |
| Password Storage | bcrypt with salt factor >= 10 |
| JWT Tokens | Signed with secret, reasonable expiry |
| Input Validation | Validate all inputs with Zod/Joi |

### 10.3 Availability

| Aspect | Target |
|--------|--------|
| System Uptime | 99.5% (target for production) |
| Offline QR Scanning | Simple cached manifest (not full offline-first) |

---

## 11. Phase 1 Scope Summary

### ✅ Included in Phase 1

| Feature | Status |
|---------|--------|
| Email/Password Authentication | ✅ |
| Passenger: Route search & filtering | ✅ |
| Passenger: Seat selection with visual layout | ✅ |
| Passenger: Booking review & mock payment | ✅ |
| Passenger: QR ticket display (simple encoding) | ✅ |
| Passenger: My bookings view | ✅ |
| Driver: QR scanner with validation | ✅ |
| Driver: Passenger manifest (with simple offline cache) | ✅ |
| Driver: Drop-off alerts | ✅ |
| Driver: Emergency reporting | ✅ |
| Operator: Fleet management (CRUD buses) | ✅ |
| Operator: Route management (CRUD routes) | ✅ |
| Operator: Trip schedule management (CRUD + overrides) | ✅ |
| Operator: Revenue analytics dashboard | ✅ |
| Operator: Manifest export (PDF & Excel) | ✅ |
| Admin: Company approval workflow | ✅ |
| Admin: User management | ✅ |
| Admin: Commission settings | ✅ |
| PostgreSQL database | ✅ |
| Express.js backend with MVC structure | ✅ |
| Flutter app with Bloc/Cubit state management | ✅ |
| Role-based UI in single app | ✅ |
| OpenStreetMaps integration | ✅ |

### ❌ Deferred to Production (Phase 2)

| Feature | Reason |
|---------|--------|
| OTP/SMS Authentication | SMS gateway integration |
| Real Mobile Money Gateway (MTN/Airtel/Zamtel) | Actual payment provider APIs |
| Hardware GPS Tracker Integration | Bus hardware integration |
| Automated SMS Gateway | SMS provider setup |
| PostGIS Geospatial | Complex geospatial queries for routing |
| Redis caching | Not needed for prototype scale |
| WebSockets/Socket.io | Polling sufficient for prototype |
| HMAC-signed QR codes | Security hardening |
| Advanced offline sync with conflict resolution | Complexity beyond prototype |
| Firebase App Distribution | Setup overhead for prototype |
| Docker containerization | Direct host deployment for now |

---

## 12. Open Questions & Decisions Needed

| # | Question | Decision |
|---|----------|----------|
| 1 | Which ORM for PostgreSQL? (Prisma vs Sequelize) | TBD - need decision |
| 2 | Specific bus seat layout design (rows, columns, layout pattern) | TBD - need design |
| 3 | Cities/routes to seed in database for demo | TBD - need data |
| 4 | Commission rate default value | TBD - e.g., 10% |
| 5 | Currency formatting (Zambian Kwacha: ZK or K) | TBD - confirm preference |
| 6 | Specific amenities list for bus profiles | TBD - need list |

---

## 13. Testing Strategy

### 13.1 Backend Testing
- Unit tests for services (auth, booking logic, QR generation)
- Integration tests for API endpoints
- Test database migrations

### 13.2 Flutter Testing
- Unit tests for Cubits/Blocs
- Widget tests for key UI components (seat selection, ticket display)
- Integration tests for critical flows (search → book → ticket)

---

**Document End**

*This specification covers Phase 1 prototype scope. Production phase (Phase 2) requirements should be documented separately as features are added.*
