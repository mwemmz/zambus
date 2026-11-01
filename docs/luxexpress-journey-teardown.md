# Lux Express (luxexpress.eu) — user journey teardown & ZamBus implementation plan

Evidence gathered with the **REA MCP** (`list_browser_targets`, `inspect_web_page`, `capture_web_screenshot`)
against a headless Chrome attached to `https://luxexpress.eu/en/`, plus:

- `_next/static/.../_buildManifest.js` (Next.js route table — authoritative page list)
- the page's own bundles (`_app`, `pages/tickets/*`, shared chunks) parsed for GraphQL documents
- live introspection of the site's own GraphQL endpoints (`/graphql`, `/v2/graphql`)

Every claim below is marked **[observed]** (captured directly) or **[inferred]** (read out of the
bundle/schema but not exercised end-to-end).

---

## 0. Technical shape of the site

| Aspect | Finding |
|---|---|
| Framework | Next.js **pages router**, localized routes `/en/…` (also `et, ru, fi, lv, lt, pl`) **[observed]** |
| Data layer | **Apollo GraphQL**: `/graphql` (customer) and `/v2/graphql` (second schema, has `adminHeaderMenu`, `corporateLogin`) **[observed]** |
| Client state | `zustand` with an SSR-hydrated store (`initialZustandState` in `__NEXT_DATA__`) **[observed]** |
| Cart identity | cookie `shopping-basket-id` (+ `msi`), cleared on a new search **[observed in bundle]** |
| Edge | Cloudflare + `rocket-loader` + `/cdn-cgi/challenge-platform/scripts/jsd/main.js` (JS challenge present) **[observed]** |
| Analytics/consent | Cookiebot, Sentry replay (`sentryReplaySession`), Exponea **[observed]** |
| Media | DigitalOcean Spaces CDN, Next image optimizer **[observed]** |

41 page routes exist, but only ~11 belong to the purchase funnel; the rest are content/profile/
maintenance pages. That route table is the cleanest statement of the journey the business models.

---

## 1. The journey, end to end

```
                     ┌─────────────────────── off-path (re-entry points) ───────────────────────┐
                     │  /profile/*  ·  /manage-booking/trips  ·  /change-tickets/*  ·  /profile/refund │
                     └──────────────────────────────────────┬───────────────────────────────────┘
                                                            │
[home] → [search] → [seat-details] → [extras] → [passenger-details] → [payment] → [thanks] → [ticket + email]
   │         │             │              │              │                 │
   │         │             │              │              │                 └─ PSP redirect (Adyen/Montonio/NeoPay/bank link)
   │         │             │              │              └─ sign-in gate, server-driven form, emergency contact
   │         │             │              └─ add-ons, transfers, parking, travel pass, voucher
   │         │             └─ seat map, seat class, price class, adjacent-seat solver
   │         └─ city/stop autocomplete → availability search (per fare class + passenger mix)
   └─ hero search widget: From / To / Departure / Return / passengers / promocode
```

### Stage 1 — Discovery / entry (`/en/`)
- Hero search widget: `From` (autocomplete), `To` (autocomplete), `Departure` (date picker),
  `Return` (optional → round trip), passenger selector, `Promocode`, `SEARCH`. **[observed]**
- Marketing blocks that funnel into search: "most popular destinations" → `/en/routes/<from>-<to>/`,
  news (`/en/news/*`), promos (`/en/promo/*`), guides/FAQ. Every route page hosts the same widget,
  pre-scoped to that city pair. **[observed]**
- Stop-level granularity: a city expands into several `BusStop`s (coach station, airport, harbor,
  roadside stops) — picking a suggestion picks a **BusStopId**, not a city. **[observed]**

### Stage 2 — Search → results (`/en/tickets/search`)
- URL contract **[observed in bundle]**:
  `/en/tickets/search?departDate=YYYY-MM-DD&returnDate=YYYY-MM-DD&currency=EUR&fromBusStopId=<id>&toBusStopId=<id>&adult=1&senior=0&youth=0&pupil=0&child=0&promocode=<code>&affiliateId=<id>`
- The state is fully URL-encoded and `shallow`-pushed, so results are shareable/back-button safe. **[observed]**
- Backing query **[observed]**:
  ```graphql
  query search($departureDate: Date!, $originBusStopId: Int, $destinationBusStopId: Int,
               $lang: String, $currency: String, $fareClasses: [SearchFareClassInput],
               $promoCode: String, $isPartOfRoundtrip: Boolean, $onlyActive: Boolean)
  ```
  Result per journey: `JourneyId`, planned/actual departure & arrival (**with timezone ids**),
  `Duration`, origin/destination stop names + ids, `Currency`, and **per price class**:
  `Available{Regular,Business,Campaign,BusinessCampaign}Seats`, `SoldLater*Seats`,
  `{Regular,Business,Campaign,BusinessCampaign}Price`, plus `PriceClasses[]`, `Legs[]`
  (`OrderNumber`, `BusCompanyName`, `BrandName`, `LineIdentifier1..3`, `AvailableEquipment[]`,
  `Passengers[]` with `SeatPricings[]`), `SalesFees`, `Notifications[]`,
  `IsForSale` + `NotForSaleReasonType` (`SOLD_OUT`, `NOT_ENOUGH_SEATS`). 
- `fareClasses` is built from the passenger mix: `[{Id:"BONUS_SCHEME_GROUP.ADULT", Count:n}, …]`. **[observed]**
- Round trip = two searches joined by `isPartOfRoundtrip`; the inbound list is filtered by
  "arrives after the outbound departed" logic. **[observed]**
- Results page keeps a live **basket timer** and a "results are out of date" modal when the
  basket ages out. **[observed]**

### Stage 3 — Seat selection (`/en/tickets/seat-details`)
- `addJourneyToBasket(OutboundJourneyId, InboundJourneyId?, PriceClass, Outbound/InboundJourneyPriceClass,
  CampaignCode?, lang, AffiliateId?, fareClasses)` **is the search→selection transition** — the cart is
  created here, before any personal data. **[observed]**
- Response is a rich product graph: `products[]` → `ShoppingBasketId`, `TotalPrice`, `HasTransfers`,
  `Basket{ValidUntil, CanRenew}`, `BasketLevelAddons[]`, `TravelPass`, `ParkingPasses[]`,
  `Transfers[]`, `PaymentMethodFees[]`, `BasketSalesFee`, and per-leg `OutboundJourneys[].Products[]`
  (`ProductId`, `ProductCode`, `RequestedFareClass`, `AssignedFareClass`, `Seats[]` with
  `SeatNumber`, `SeatClass`, `SeatFloorNumber`, `Price`). **[observed]**
- Seat map from `seatPlan(...)`; seat classes `SEAT_CLASS.A` / `SEAT_CLASS.B`, categories
  `SEAT_CLASS_CATEGORY.BUSINESS`; price classes `Regular|Business|Campaign|CampaignBusiness`. **[observed]**
- Mutations used while poking at seats: `changeSeatNumber`, `getAvailablePricesForProducts`,
  `updateProductPrices`. Bundle also implements an **adjacent-seat solver** for extra seats
  ("No adjacent seats available", "Cannot find adjacent seats") and re-prices after every change. **[observed]**
- Passengers are *products*, one per person per leg — that is what makes multi-passenger,
  round-trip and seat-change logic tractable.

### Stage 4 — Extras (`/en/tickets/extras`)
- `getJourneyAddons(lang, productIds[], currency, addonId?)` → `addons.LegAddOns[]`
  (`AddonId`, `ServiceName`, `UnitPrice`, `VatRate`, `Description`, `SalesLimit`,
  `UnitPriceOnNextLegs`), then `addAddon(productId, addons[])`. **[observed]**
- Basket-level extras (`BasketLevelAddons`, e.g. SMS service), `Transfers` (`availableTransfers`,
  `addTransfer`, `transferInformation`), parking passes and travel passes are all cart objects. **[observed]**
- Attach check: entering this page without passenger products aborts with
  "First fill out information about passengers". **[observed]**

### Stage 5 — Passenger details (`/en/tickets/passenger-details`)
- The form is **server-driven**: `passengersDataFields(lang, productIds[])` returns, per product,
  `Passenger[]` and `EmergencyContact[]` field descriptors — `Key`, `KeyName`, `DisplayType`
  (`FIELD_DISPLAY_TYPE.MANDATORY`, …), `ValueClassificationGroup`, `DropdownItems[]` — plus
  `LoyaltyProgramProviders[]`. **[observed]**
- Field keys seen: `PassengerFirstName/LastName/FatherName`, `DateOfBirth`, `CitizenshipId`,
  `DocumentType`, `DocumentNumber`, `DocumentIssuingCountry`, `DocumentExpirationDate`,
  `EntryPermitType`, `LoyaltyCardNumber`, `PhoneNumber`, `PhoneAreaCode`. **[observed]**
- Writes: `updateCustomerInfo([...])` (per passenger), `updateBuyerInfo(...)` (contact/buyer),
  `changeSeatNumber`, `updateProductPrices`. **[observed]**
- Marketing consent + "Please enter contact person name and phone number below". **[observed]**

### Stage 6 — Payment (`/en/tickets/payment`)
- Cart is re-read (`basketContent`, `basketJourneys`, `basketTotalPrice`), then one of several
  payment rails is chosen. Every rail is its own mutation family: **[observed]**
  - `adyenSession` / `adyenPayment` / `adyenPaymentDetails` (card, redirect-based)
  - `montonioPayment(bankCode, clientReturnUrl, countryCode, language)` → `paymentUrl`, then
    `montonioPaymentDetails(token)` → `paymentStatus`
  - `neoPayInitiatePayment(bank, clientRedirectUrl, country)` / `neoPayDetails(token)`
  - `bankLinkPayment`, `payWithVoucher(VoucherCode)`, `addVouchersToBasket`
  - `startBasketPayment(basketId)`, `zeroPaymentPay(Currency)` (100 % discount / voucher covers all)
  - `corporateClientPay` (B2B contract, enabled by `corporate-token` / `isCorporate` cookies)
- Fees are modelled, not hardcoded: `PaymentMethodFees[]`, `BasketSalesFee`, `SalesFees`. **[observed]**
- Two hard invariants enforced client-side: **basket TTL** (`renewBasketExpirationTime`,
  "Shopping cart timed out", warning modal at < 2 min) and **single-tab ownership**
  ("Booking session interrupted by another tab"). **[observed]**

### Stage 7 — Confirmation (`/en/tickets/thanks`)
- Server response is the ticket object set: `ShoppingBasketCode`, `ShoppingBasketId`,
  `ActiveModificationSessionId`, legs (`Legs[]` with planned vs actual times, platforms),
  `Seats[]` (`BusNameTag`, `LegOrderNumber`, `SeatNumber`, `SeatClass`, `SeatFloorNumber`, `QrCode`),
  `Coupons[]` (`CouponNumber`, `QrCode`). **[observed]**
- `sendTicketsToEmail(email, lang, basketId)` and `ticketsFileUrl` (PDF) are the delivery paths;
  `validateTickets(productCode)` is the scanner-side verification. **[observed]**
- The same basket is re-openable later via `/manage-booking/trips` (booking number + email). **[observed]**

---

## 2. Off-path journeys (equal weight in the model)

| Journey | Routes | Operations |
|---|---|---|
| Account | `/profile/dashboard`, `personal-info`, `security`, `settings`, `payment-methods`, `vouchers`, `trips`, `customer-program`, `corporate-users` | `signUp`, `sendEmail`, `verifyEmailCode`, `signIn`, `changePassword`, `forgotPassword`, `resetPassword`, `updateProfile`, `uploadAvatar`, `profileExists` |
| Ticket change | `/change-tickets/search`, `seat-details`, `payment`, `thanks` | `modificationInfo`, `modificationSearch`, `modificationJourneyConfirm`, `modificationSeatPlans`, `modificationChangeSeat`, `modificationPayableAmount`, + the whole `modification*Payment*` family |
| Refund / cancel | `/profile/refund` | `calculateReturn` → `commitReturn`, `modificationCancel` |
| Vouchers / gift cards | `/profile/vouchers` | `sendVoucherToEmail`, `voucherFileUrl`, `addVouchersToBasket`, `VOUCHER_TYPE.GIFT_CARD` |
| Support | `/faq-search`, `/faq/[slug]`, `/contacts` | content |
| Interline brands | any | `BrandName` / `BusCompanyName` can be a partner (`Tallink AS`, `Leo Express`) with its own availability check and refund rules |

---

## 3. The domain model this journey implies

```
City ─┬─ BusStop (station | airport | harbor | roadside)   ← search is stop→stop
      └─ Route slug (/routes/tallinn-tartu)

Journey (a sellable departure) ── Legs[] (OrderNumber, operator, brand, equipment)
      └─ PriceClass: Regular | Business | Campaign | CampaignBusiness
             └─ availability: available / soldLater seats per class
                    └─ Product  ← ONE PER PASSENGER PER LEG (the unit of everything)
                           ├─ Seat (number, class, floor, price)
                           ├─ FareClass / discount group (ADULT, THE_ELDERLY, THE_YOUNG,
                           │   CHILDREN, STUDENTS, PET, HANDICAP, OTHER…)
                           ├─ AddOns[]
                           ├─ Passenger data (server-described fields) + emergency contact
                           └─ QrCode

Basket (ShoppingBasketId, ShoppingBasketNumber, ValidUntil, CanRenew)
      ├─ Products[] · Journeys[] · Transfers[] · ParkingPasses[] · TravelPass
      ├─ BasketLevelAddons[] · Vouchers[]
      ├─ Fees: BasketSalesFee · PaymentMethodFees[] · SalesFees
      └─ Payment: Adyen | Montonio | NeoPay | BankLink | Voucher | Zero | Corporate
```

**Four decisions worth copying**

1. **Cart before identity.** The basket is created during seat selection, before login or any
   personal data. Login is only demanded at checkout — abandonment drops sharply because the
   price is already locked in.
2. **Seat = product, not booking.** Multi-passenger, round-trip, seat changes, per-passenger
   documents and per-leg add-ons all fall out of that single modelling choice.
3. **Server-driven passenger form.** Document requirements differ per destination/citizenship;
   shipping the field list from the backend avoids app releases per market.
4. **Fees and discounts are data.** Sales fees, payment-method fees and discount groups live in
   the basket/fare model, not in code paths.

**Two anti-patterns to avoid**

- 9 discount groups (`BONUS_SCHEME_GROUP.OTHER2` is a tell) and 4 price classes on day one —
  that is a decade of accreted commercial policy, not an MVP.
- Basket TTL + multi-tab locking + "results out of date" notices are three separate UX mechanisms
  solving one problem. A token/session version check can cover all three.

---

## 4. Gap analysis: ZamBus today vs. this journey

ZamBus current model (`backend/src/models`): `User`, `BusCompany`, `Bus`, `Route`, `Trip`,
`Booking`, `EmergencyReport`. `Booking` = **one seat on one trip** with
`paymentStatus ∈ {PENDING, CONFIRMED, REFUNDED}` and `qrCodeData` inline.

| Journey capability | Lux Express | ZamBus | Verdict |
|---|---|---|---|
| Stop-level search (airport/harbor/subsidiary stops) | yes | route-level only (`Route.origin/destination`) | **adopt** — add `BusStop` table |
| Round trip in one flow | yes | no | defer |
| Passenger mix / discount groups | 5 counts × 9 groups | none | **adopt reduced**: `ADULT`, `CHILD`, `STUDENT`, `SENIOR` |
| Price classes (Regular/Business/Campaign) | 4 | single `fareAmount` | **adopt 1–2** (`STANDARD`, `PREMIUM`) |
| Multi-seat cart | basket + products | 1 seat per booking, N bookings per purchase | **adopt** — the single biggest structural gap |
| Cart TTL / resume | 10 min + renew + cookie | none (seat lock only) | **adopt** (ZamBus already has `seatLockDurationMinutes`) |
| Add-ons, transfers, parking | full graph | none | defer (start with 1 add-on type) |
| Server-driven passenger form | yes | fixed `fullName/phone/email` | **adopt lite**: per-route required-document policy |
| Payment rails | 6 provider families | mock confirm | **adopt 1 real PSP** + webhook/return handler |
| Ticket = QR + PDF + email + validation | yes | `qrCodeData` on booking | **adopt**: signed payload + `/validate` endpoint already exists |
| Change / refund journey | full `modification*` family | admin refund only | phase 5 |
| Multi-language / multi-currency | 7 / 3 | 1 (`en`, ZMW) | later |
| Interline partner brands | yes (Tallink, Leo) | no | out of scope |

---

## 5. Implementation plan for ZamBus

### Phase 1 — Cart (unblocks everything else)
New tables (Sequelize, snake-free camelCase like the rest of the codebase):

```
carts            cartId, userId?, guestToken, status(OPEN|CHECKED_OUT|EXPIRED|ABANDONED),
                 currency, subtotal, fees, total, expiresAt, createdAt
cart_items       cartItemId, cartId, tripId, seatNumber, priceClass,
                 passengerType(ADULT|CHILD|STUDENT|SENIOR), unitPrice, status
                 (HELD|CONFIRMED|RELEASED), lockExpiresAt
```
- `Booking` stays the post-payment artifact; add `cartId` + `cartItemId` so one payment produces
  N bookings.
- API: `POST /api/carts`, `POST /api/carts/:id/items`, `PATCH …/items/:itemId` (seat/price class),
  `DELETE …/items/:itemId`, `GET /api/carts/:id`, `POST /api/carts/:id/checkout`.
- Reuse the existing seat-lock mechanism as the item hold; cart TTL = max(item locks).
- Guest cart via signed cookie (`zambus-cart`), claimed on login — this is what makes
  "cart before identity" work.

### Phase 2 — Search contract
- Add `busStops` to `Route` (`RouteStop` join with `sequence`, `offsetMinutes`), keep
  `Route.origin/destination` as denormalised convenience.
- `GET /api/trips/search?fromStopId&toStopId&date&adult&child&student&senior&priceClass`
  returning, per trip: `tripId`, times **plus timezone**, `durationMinutes`, per-class
  `availableSeats` / `soldSeats`, `price`, `isForSale`, `notForSaleReason`.
- Make the results page URL the single source of truth (parse→state→`replaceState`), so the
  back button, refresh and sharing all work. This is `SearchTripsPage`'s largest current gap.

### Phase 3 — Selection & passengers
- Seat map endpoint returns seat → `priceClass`, `seatClass`, `floor`, `isAvailable`; keep the
  current `SeatMap` type but add `priceClass`.
- Replace the fixed passenger form with a **field-descriptor endpoint**:
  `GET /api/trips/:tripId/passenger-fields?citizenship=` → `[{key, label, displayType,
  options?, group}]`. Small now, saves a redesign when ZamBus adds cross-border routes.
- Keep `Booking.passengerId` for account holders, but store per-item passenger snapshots on
  `cart_items` so guest checkout and name-changes work.

### Phase 4 — Payment
- One provider, three endpoints, one state machine:
  `POST /api/payments/intents` → `{providerRef, redirectUrl}`, `POST /api/payments/:id/confirm`,
  `POST /api/payments/webhook` (idempotent, signature-verified).
- States: `CREATED → PENDING → AUTHORISED → CAPTURED | FAILED | EXPIRED | REFUNDED`.
- On `CAPTURED`: atomically flip `cart_items` → bookings, generate QR payloads, send email/PDF.
- Keep the existing mock as `provider=mock` behind the same interface so demos keep working.
- Fees: put `paymentMethodFee` and `platformCommissionRate` in the fee breakdown returned by the
  cart (the `PLATFORM_COMMISSION_RATE` env var already hints at this).

### Phase 5 — Post-purchase
- `POST /api/bookings/:id/change` (price difference quote → confirm) and
  `/refund` (quote → commit) mirroring `calculateReturn`/`commitReturn`.
- Driver scan already exists (`qrCodeData` validation) — upgrade the payload to a signed,
  short-lived token and add `POST /api/tickets/validate` returning a per-leg verdict.

### Frontend / Flutter
Route the app around the cart, not the booking:

```
/search  →  /trips/:tripId/seats  →  /cart/:cartId/extras  →  /cart/:cartId/passengers
         →  /cart/:cartId/payment  →  /bookings/:id/ticket
```
- Web (`frontend/src/App.tsx`): today's `trips/:tripId` + `bookings/:bookingId` split needs a
  `cart/:cartId` segment; `TicketPage` becomes the post-payment artifact only.
- Flutter (`zambus_mobile`): the existing `presentation/` + `data/` split maps cleanly onto
  `CartRepository` / `CartBloc`; keep `ApiDatasource` and add cart endpoints there so both
  clients share the same contract.

### Suggested order of work (smallest shippable slices)
1. `BusStop` + search API + URL-driven results page (no cart changes) — visible win, low risk.
2. `Cart` + `cart_items` behind a feature flag; `Booking` created only at confirmation.
3. Move seat selection to the cart API + per-item passenger snapshots.
4. Real PSP behind the existing mock interface.
5. Add-ons, then change/refund.

---

## 6. Evidence trail & limitations

- **Observed via REA:** page target `https://luxexpress.eu/en/` (Chrome 156 headless), 2239 DOM
  nodes, 1215 accessibility nodes, 20 scripts (incl. a 3.25 MB `_app` chunk), storage keys
  `luxexpress-storage` / `sentryReplaySession` / `_cltk`, full-viewport screenshot.
- **Observed via the site's own GraphQL:** `cities`, `busStops`, `popularDestinations`,
  `fareClasses` (9 discount groups), full `query`/`mutation` field lists for both schemas.
- **Read from bundles:** the 41-route `_buildManifest`, the `search` and `addJourneyToBasket`
  documents, the search URL contract, cookie names and TTL/multi-tab invariants.
- **Not verified end-to-end:** an actual purchase. Replaying `search` directly against
  `/graphql` returns `{"errors":[{"message":"'ErrorResponse' object has no attribute 'journeys'"}]}`
  for every date/parameter combination tried — a backend-side failure surfaced as a serialization
  bug, so the site's own client must be sending something extra (session/cookie/header) that a
  bare GraphQL call lacks. Order-confirmation field lists therefore come from the schema
  documents, not from a captured order.
- **Tooling limits hit:** `analyze_web_bundle` and `capture_browser_scenario` both exceeded the
  MCP 60 s request timeout against this 3.3 MB bundle; `analyze_web_bundle` needs a longer
  per-request `timeout` in `~/.pi/agent/mcp.json` to be usable on sites this large.
