# ZamBus MVP User Workflow

## 1. Overview

ZamBus is a smart digital intercity bus management system connecting passengers, bus operators, drivers/conductors, the operations center, and system administrators.

The core MVP workflow is:

```text
Trip Creation → Passenger Booking → Simulated Payment → QR Ticket
→ Conductor Verification → Boarding Confirmation → Operator Reporting
```

---

## 2. Overall System Workflow

```text
                    ┌──────────────────────┐
                    │      App / Website   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          Passenger       Bus Operator    Driver/Conductor
                │              │              │
                └──────────────┼──────────────┘
                               ▼
                     ┌─────────────────┐
                     │  ZamBus Backend │
                     │ Node.js + DB    │
                     └────────┬────────┘
                              │
                              ▼
                    Operations / Admin
```

---

# 3. Passenger User Workflow

The passenger searches for a trip, selects a seat, completes payment, and receives a digital QR ticket.

```text
[Open ZamBus App]
        │
        ▼
[Check Internet + App Version]
        │
        ▼
[Login / Register]
        │
        ├── Phone OTP
        └── Email + Password
        │
        ▼
[Home Dashboard]
        │
        ▼
[Enter Travel Details]
        │
        ├── Origin
        ├── Destination
        └── Travel Date
        │
        ▼
[View Available Trips]
        │
        ├── Operator
        ├── Bus Category
        ├── Departure Time
        ├── Arrival Time
        ├── Fare
        └── Remaining Seats
        │
        ▼
[Filter / Sort Results]
        │
        ▼
[Select Trip]
        │
        ▼
[View Bus Seat Layout]
        │
        ├── Green = Available
        ├── Red = Occupied
        └── Yellow = Temporarily Held
        │
        ▼
[Select Seat]
        │
        ▼
[Seat Locked for 10 Minutes]
        │
        ▼
[Review Booking]
        │
        ├── Passenger Details
        ├── Route
        ├── Seat Number
        ├── Fare
        └── Departure Time
        │
        ▼
[Checkout / Mock Payment]
        │
        ├── Payment Successful
        │       │
        │       ▼
        │ [Booking Confirmed]
        │       │
        │       ▼
        │ [Generate QR Ticket]
        │       │
        │       ▼
        │ [View / Save Digital Ticket]
        │
        └── Payment Failed / Cancelled
                │
                ▼
        [Booking Remains Pending or Seat Released]
```

### Passenger End State

The passenger receives:

- Booking reference
- QR code ticket
- Seat number
- Bus registration number
- Route details
- Departure time
- Boarding status

---

# 4. Driver / Conductor Workflow

The driver or conductor verifies tickets, manages the passenger manifest, and reports trip incidents.

```text
[Open Driver/Conductor App]
        │
        ▼
[Login]
        │
        ▼
[View Assigned Trips]
        │
        ▼
[Select Active Trip]
        │
        ▼
[View Trip Details]
        │
        ├── Route
        ├── Bus
        ├── Departure Time
        └── Passenger Manifest
        │
        ▼
[Begin Boarding]
        │
        ▼
[Scan Passenger QR Code]
        │
        ▼
[Validate Ticket]
        │
        ├── Valid Ticket
        │       │
        │       ▼
        │ [Mark Passenger as BOARDED]
        │       │
        │       ▼
        │ [Update Manifest]
        │
        ├── Already Used
        │       │
        │       ▼
        │ [Show Duplicate Warning]
        │
        └── Invalid Route / Date
                │
                ▼
        [Reject Ticket]
        │
        ▼
[Continue Scanning Passengers]
        │
        ▼
[View Passenger Manifest]
        │
        ▼
[Monitor Drop-off Points]
        │
        ▼
[Trip In Progress]
        │
        ├── Breakdown
        ├── Accident
        └── Severe Delay
                │
                ▼
        [Send Emergency Alert]
        │
        ▼
[Complete Trip]
```

## Offline Scanning Workflow

```text
[Scan QR Code]
      │
      ▼
[Internet Available?]
      │
      ├── YES → Validate with Backend
      │
      └── NO
           │
           ▼
     [Validate Using Local Cache]
           │
           ▼
     [Store Scan Locally]
           │
           ▼
     [Internet Restored]
           │
           ▼
     [Sync Scan Records]
```

---

# 5. Bus Operator Workflow

The bus operator manages buses, routes, schedules, bookings, and revenue.

## 5.1 Operator Dashboard

```text
[Open Operator Dashboard]
        │
        ▼
[Login]
        │
        ▼
[Operator Dashboard]
        │
        ├── Fleet Management
        ├── Route Management
        ├── Trip Scheduling
        ├── Booking Management
        └── Revenue Reports
```

## 5.2 Fleet Management

```text
[Fleet Management]
        │
        ▼
[View Buses]
        │
        ├── Add Bus
        ├── Edit Bus
        └── Update Maintenance Status
        │
        ▼
[Enter Bus Information]
        │
        ├── Registration Number
        ├── Model
        ├── Seat Capacity
        ├── Amenities
        └── Maintenance Status
        │
        ▼
[Save Bus]
```

## 5.3 Route and Trip Scheduling

```text
[Route Management]
        │
        ▼
[Create / Edit Route]
        │
        ├── Origin
        ├── Destination
        └── Intermediate Stops
        │
        ▼
[Create Trip Schedule]
        │
        ├── Select Bus
        ├── Assign Driver
        ├── Set Departure Time
        ├── Set Estimated Arrival
        ├── Set Fare
        └── Set Trip Date
        │
        ▼
[Publish Trip]
        │
        ▼
[Trip Becomes Available to Passengers]
```

## 5.4 Trip Control

```text
[View Active Trips]
        │
        ▼
[Select Trip]
        │
        ├── Open Boarding
        ├── Delay Trip
        ├── Close Trip
        └── Cancel Trip
```

## 5.5 Revenue Workflow

```text
[Revenue Dashboard]
        │
        ▼
[Select Date / Route / Trip]
        │
        ▼
[View Financial Metrics]
        │
        ├── Total Revenue
        ├── Occupancy Rate
        ├── Commission Deduction
        └── Net Payout
        │
        ▼
[Export Passenger Manifest]
        │
        └── PDF / Excel
```

---

# 6. System Administrator Workflow

The system administrator approves bus companies, manages platform users and settings, and configures commissions.

```text
[Open Admin Panel]
        │
        ▼
[Login]
        │
        ▼
[Admin Dashboard]
        │
        ├── Manage Bus Operators
        ├── Manage Users
        ├── Manage Platform Settings
        ├── Configure Commission
        └── Monitor System
```

## 6.1 Operator Approval Workflow

```text
[New Bus Company Registers]
        │
        ▼
[Admin Reviews Application]
        │
        ├── Approve
        │     │
        │     ▼
        │ [Company Goes Live]
        │     │
        │     ▼
        │ [Can Publish Trips]
        │
        └── Reject
              │
              ▼
        [Company Remains Inactive]
```

## 6.2 Commission Configuration

```text
[Commission Settings]
        │
        ▼
[Set Platform Commission Percentage]
        │
        ▼
[Save Configuration]
        │
        ▼
[Automatically Applied to Bookings]
        │
        ▼
[Operator Net Payout Calculated]
```

---

# 7. Operations Center Workflow

The Operations Center monitors active trips and emergency incidents.

```text
[Open Operations Dashboard]
        │
        ▼
[View Active Trips]
        │
        ▼
[View Live Trip Map]
        │
        ├── Active Buses
        ├── Trip Status
        ├── System Traffic
        └── Emergency Alerts
        │
        ▼
[Emergency Alert Received?]
        │
        ├── NO → Continue Monitoring
        │
        └── YES
             │
             ▼
       [Open Incident]
             │
             ▼
       [View Trip / Bus Details]
             │
             ▼
       [Contact / Coordinate Response]
             │
             ▼
       [Mark Incident Resolved]
```

---

# 8. Complete End-to-End MVP Workflow

This workflow shows how all roles interact during a real booking.

```text
┌──────────────────────┐
│   SYSTEM ADMIN       │
│ Approves Bus Company │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   BUS OPERATOR       │
│ Adds Bus             │
│ Creates Route        │
│ Schedules Trip       │
│ Sets Fare            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   PASSENGER          │
│ Searches Trip        │
│ Selects Seat         │
│ Makes Mock Payment   │
│ Receives QR Ticket   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ DRIVER / CONDUCTOR   │
│ Opens Assigned Trip  │
│ Scans QR Ticket      │
│ Confirms Boarding    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   OPERATIONS CENTER  │
│ Monitors Active Trip │
│ Handles Alerts       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   TRIP COMPLETED     │
│ Booking + Revenue    │
│ Records Finalized    │
└──────────────────────┘
```

---

# 9. Recommended MVP Navigation Structure

## 9.1 Passenger App

```text
Bottom Navigation:
├── Home
├── My Bookings
├── Tickets
└── Profile
```

### Passenger Screens

```text
Splash
 → Login/Register
 → Home
 → Search Trips
 → Trip Results
 → Seat Selection
 → Booking Review
 → Mock Payment
 → Booking Confirmation
 → QR Ticket
```

## 9.2 Driver / Conductor App

```text
Bottom Navigation:
├── My Trips
├── Scan Ticket
├── Manifest
└── Profile
```

### Driver / Conductor Screens

```text
Login
 → Assigned Trips
 → Trip Details
 → Start Boarding
 → QR Scanner
 → Validation Result
 → Passenger Manifest
 → Emergency Report
```

## 9.3 Operator Dashboard

```text
Sidebar:
├── Dashboard
├── Buses
├── Routes
├── Trips
├── Bookings
├── Revenue
└── Settings
```

## 9.4 Admin Dashboard

```text
Sidebar:
├── Dashboard
├── Bus Companies
├── Users
├── Active Trips
├── Emergency Incidents
├── Commission Settings
└── System Settings
```

---

# 10. MVP Scope Simplification

For the first working MVP, implement the following workflow:

```text
Admin approves operator
        ↓
Operator creates bus
        ↓
Operator creates route
        ↓
Operator schedules trip
        ↓
Passenger searches trip
        ↓
Passenger selects seat
        ↓
Passenger makes simulated payment
        ↓
System generates QR ticket
        ↓
Conductor scans QR
        ↓
System marks passenger boarded
        ↓
Operator views bookings and revenue
```

## Features That Can Be Mocked or Deferred

- Real MTN, Airtel, and Zamtel payment APIs
- Real GPS bus tracking
- Automated SMS notifications
- Advanced emergency coordination
- Full offline synchronization
- Complex settlement automation

---

# 11. Summary

The ZamBus MVP is centered on the following process:

```text
Operator Creates Trip
        ↓
Passenger Books Seat
        ↓
Passenger Completes Mock Payment
        ↓
System Generates QR Ticket
        ↓
Conductor Scans Ticket
        ↓
Passenger Is Marked as Boarded
        ↓
Operator Views Booking and Revenue Data
```

This provides the minimum complete business cycle for a functional intercity bus booking platform.
