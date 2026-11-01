# User Requirements Document (URD)

## Executive Summary

**Project Name:** ZamBus – Smart Digital Intercity Bus Management System for Zambia  
**Target Platform:** Cross-Platform Mobile App (Flutter) & Web Administration Dashboards (Flutter Web / Modern Frontend)  
**Backend Architecture:** Node.js, Express/NestJS, PostgreSQL/MongoDB, Redis, WebSockets  

ZamBus is a digital platform designed for the Zambian intercity transport sector. It bridges the gap between passengers, bus operators, and onboard conductors by digitizing seat reservations, mobile ticketing, QR-based boarding, live trip monitoring, and financial settlement.

---

## Technical Stack Architecture

| Layer | Primary Technology | Purpose |
| :--- | :--- | :--- |
| **Mobile Client** | **Flutter** (Dart) | Single codebase for Passenger App and Driver/Conductor App (iOS & Android) |
| **Web Dashboards** | **Flutter Web** / React | Bus Operator Portal, Operations Center, and Global Admin Panel |
| **Backend API** | **Node.js** (TypeScript) | RESTful API endpoints, microservices, business logic execution |
| **Real-time Engine** | **Socket.io** / WebSockets | Live seat locks, emergency reporting, and fleet tracking |
| **Caching Layer** | **Redis** | Temporary seat locks (concurrency control), session handling, OTP cache |
| **Database** | **PostgreSQL** + PostGIS | Relational data integrity (bookings, revenue) and geospatial route tracking |

---

## User Roles & System Stakeholders

* **Passenger:** End-user who searches routes, reserves seats, pays for tickets, and presents QR codes for boarding.
* **Bus Operator (Company Admin):** Manages company fleets, routes, schedules, ticket pricing, and tracks daily revenue.
* **Driver / Conductor:** Scans passenger tickets, manages boarding manifests, tracks drop-offs, and issues trip alerts.
* **ZamBus Operations Center:** Monitors system health, live active trips, and emergency incidents across all operators.
* **System Administrator:** Onboards bus companies, controls platform settings, manages user permissions, and oversees commission splits.

---

## Functional Requirements

### 1. Passenger Mobile Application (Flutter)

```
[ App Launch ] ➔ [ Auth / OTP ] ➔ [ Home Dashboard ] ➔ [ Route Search ]
                                                              │
[ Digital QR Ticket ] ◄─ [ Payment ] ◄─ [ Booking Review ] ◄─ [ Seat Selection ]
```

#### 1.1 Application Launch & Authentication
* **REQ-PAS-001:** The app shall display a branded splash screen and perform automated checks for active internet connectivity and app versioning.
* **REQ-PAS-002:** The system shall support user authentication via Mobile Phone Number (OTP via SMS) and Email/Password combination.
* **REQ-PAS-003:** The backend (Node.js) shall handle session tokens (JWT) and support automatic session recovery.

#### 1.2 Home Dashboard & Route Search
* **REQ-PAS-004:** Passengers shall be able to search trips by specifying **Origin**, **Destination**, and **Travel Date**.
* **REQ-PAS-005:** Search results shall render real-time trip cards including: Operator Name, Bus Category, Departure/Arrival Times, Unit Price, and Remaining Seats.
* **REQ-PAS-006:** Results must be filterable by *Lowest Price*, *Earliest Departure*, and *Bus Category (Luxury, Semi-Luxury, Standard)*.

#### 1.3 Smart Seat Selection & Concurrency Handling
* **REQ-PAS-007:** The app shall display a visual 2D bus seat layout with dynamic seat statuses:
  * 🟢 **Green:** Available
  * 🔴 **Red:** Occupied / Paid
  * 🟡 **Yellow:** Temporarily Reserved / Held
* **REQ-PAS-008:** **Seat Concurrency Rule:** When a seat is selected, Node.js + Redis shall place a 10-minute temporary lock on the seat. If payment is not completed within 10 minutes, the lock expires automatically.
* **REQ-PAS-009:** The system shall enforce database-level row locks to prevent duplicate bookings for the exact same seat.

#### 1.4 Payment Engine & QR Ticket Generation
* **REQ-PAS-010:** The application shall process payments via integrated Zambian Mobile Money gateways (MTN Mobile Money, Airtel Money, Zamtel Kwacha) and Credit/Debit cards. *(Mocked/Bypassed for Prototype Phase)*.
* **REQ-PAS-011:** Upon successful payment validation, the backend shall generate an encrypted payload encoded inside a high-contrast **QR Code Ticket**.
* **REQ-PAS-012:** The ticket shall display offline-accessible info: Ticket ID, Passenger Name, Seat Number, Route, Bus Reg Number, Departure Time, and Boarding Status.

---

### 2. Driver & Conductor Application (Flutter)

#### 2.1 Boarding Verification (QR Scanner)
* **REQ-DRV-001:** The application shall utilize the device camera as a real-time QR scanner.
* **REQ-DRV-002:** The app shall validate scanned tickets against the backend manifest, displaying explicit visual/auditory feedback:
  * ✅ **Valid Ticket** (Mark as Boarded)
  * ⚠️ **Duplicate / Already Used**
  * ❌ **Invalid Route / Wrong Date**
* **REQ-DRV-003:** The system must support local caching to allow QR validation in areas with poor cellular connection, syncing back to the backend once connectivity is restored.

#### 2.2 Passenger Manifest & Trip Execution
* **REQ-DRV-004:** Conductors shall view a real-time passenger manifest sorted by seat numbers, displaying boarding and drop-off statuses.
* **REQ-DRV-005:** The app shall alert conductors to upcoming passenger drop-off points along the intercity route.
* **REQ-DRV-006:** **Emergency Reporting:** Drivers shall have one-touch emergency triggers for *Breakdown*, *Accident*, or *Severe Delay*, triggering automated Push/SMS notifications to passengers and operations staff.

---

### 3. Bus Operator Web Dashboard (Flutter Web / Node.js)

#### 3.1 Fleet & Schedule Management
* **REQ-OPR-001:** Operators shall register and manage bus profiles (Registration No., Model, Seat Capacity, Amenities, Maintenance Status).
* **REQ-OPR-002:** Operators shall configure recurring or one-off trip schedules by assigning origin, destination, intermediate stops, fares, assigned bus, and driver.
* **REQ-OPR-003:** Fleet managers shall have master overrides to open, close, delay, or cancel active trip schedules.

#### 3.2 Revenue & Operational Analytics
* **REQ-OPR-004:** The dashboard shall render real-time financial metrics, including Total Revenue, Average Occupancy Rate per Route, Commission Deductions, and Net Payouts.
* **REQ-OPR-005:** Operators can export passenger manifests (PDF/Excel) prior to bus departure for terminal clearance.

---

### 4. Operations Center & Admin Panel

* **REQ-ADM-001:** Super Admins shall review and approve bus operating companies before they go live on the platform.
* **REQ-ADM-002:** Operations center staff shall view an interactive map tracking active trips, live system traffic, and active emergency alerts across Zambia.
* **REQ-ADM-003:** Configurable automated revenue-sharing models (e.g., deducting X percentage platform commission per booked ticket).

---

## Data Architecture & Entity Relationship Summary

```
 ┌────────────────┐          1:N         ┌────────────────┐
 │  Bus Company   ├─────────────────────►│      Bus       │
 └───────┬────────┘                      └───────┬────────┘
         │ 1:N                                   │ 1:N
         ▼                                       ▼
 ┌────────────────┐          1:N         ┌────────────────┐
 │     Route      ├─────────────────────►│     Trip       │
 └────────────────┘                      └───────┬────────┘
                                                 │ 1:N
 ┌────────────────┐          1:N                 ▼
 │   Passenger    ├─────────────────────►┌────────────────┐
 └────────────────┘                      │    Booking     │
                                         └────────────────┘
```

### Core Schema Definition (Node.js/PostgreSQL Perspective)

```sql
-- Users (Passengers, Drivers, Admins)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active Schedules / Trips
CREATE TABLE trips (
    trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(bus_id),
    route_id UUID REFERENCES routes(route_id),
    departure_time TIMESTAMP NOT NULL,
    estimated_arrival TIMESTAMP NOT NULL,
    fare_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' -- SCHEDULED, BOARDING, IN_TRANSIT, COMPLETED, CANCELLED
);

-- Individual Seat Bookings
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(trip_id),
    passenger_id UUID REFERENCES users(user_id),
    seat_number INT NOT NULL,
    qr_code_hash TEXT UNIQUE NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, REFUNDED
    boarding_status VARCHAR(20) DEFAULT 'NOT_BOARDED', -- NOT_BOARDED, BOARDED, DROPPED_OFF
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Non-Functional Requirements

### 1. Performance & Scalability
* **API Response Time:** Node.js REST API responses must execute within <= 200ms under normal load conditions.
* **Concurrency:** The backend architecture must handle at least 2,000 concurrent websocket connections during peak holiday booking periods.
* **Mobile Efficiency:** The Flutter mobile application must maintain lightweight state management, keeping memory consumption below 150MB on standard mobile devices.

### 2. Security & Compliance
* **Data Transmission:** All HTTP communications must strictly enforce TLS 1.3 / HTTPS encryption.
* **Data Protection:** User passwords must be hashed using `bcrypt` (salt factor >= 10).
* **QR Validation Security:** QR ticket payloads must contain cryptographic signatures (HMAC-SHA256) signed with a server secret to prevent ticket forging.

### 3. Availability & Offline Resiliency
* **System Uptime:** Target minimum platform availability of 99.5% SLA.
* **Conductor Offline Scanning:** Scanned validation data must locally persist in SQLite on the mobile device if internet connection fails mid-journey, syncing batch logs upon reconnecting.

---

## Prototype Scope Matrix (Phase 1 vs. Production)

| Feature Module | Included in Prototype Phase | Deferred to Production (Phase 2) |
| :--- | :---: | :---: |
| **Passenger Mobile UI** (Search, Seat UI, Mock Checkout) | Included | — |
| **Driver QR Scanner & Manifest** | Included | — |
| **Operator Admin Dashboard** | Included | — |
| **Simulated Payment Gateway** | Included | — |
| **Real Mobile Money Gateway Integration** (MTN/Airtel API) | — | Production |
| **Hardware GPS Tracker Integration** on Buses | — | Production |
| **Automated SMS Gateway** | — | Production |
