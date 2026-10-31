# GreenTrack — methodology

GreenTrack helps operators understand fuel use, efficiency, occupancy and **estimated**
direct CO₂ emissions. It is a measurement tool, not a certification scheme.

## Principles

1. **Estimated, not verified.** Every emissions number is labelled `isEstimate: true`.
   The API never returns fields named `reduction`, `saved` or `offset`.
2. **Actual vs estimated.** Fuel and distance come from a real `FuelRecord`. Anything not
   derived from a record is reported as missing, never silently estimated.
3. **Occupancy is context, not proof.** Higher occupancy is reported next to emissions; the
   API includes an `interpretation` string stating that occupancy alone does not demonstrate
   an emissions reduction.
4. **Explainable history.** Every stored calculation records the methodology version and the
   emission factor row used, so old reports stay auditable after factors change.
5. **Configurable factors.** Emission factors live in the database with their source and
   scope. No factor is hardcoded in business logic.

## Inputs

A `FuelRecord` (one per trip) contains:

| Field | Meaning |
|---|---|
| `fuelType` | DIESEL, PETROL, ELECTRIC, HYBRID, CNG |
| `litresConsumed` | Litres used on the trip (> 0) |
| `distanceKm` | Distance actually travelled (> 0) |
| `tripId` | Trip the fuel was consumed on |
| `busId`, `operatorId` | Fleet and tenancy attribution |
| `recordedByUserId` | Who submitted the record |
| `source` | MANUAL or SENSOR |

Passengers carried = tickets with `status = USED` for the trip (actual boarded), falling back
to confirmed bookings only when no boarding data exists — the response states which basis
was used in `passengersBasis`.

Bus capacity comes from the trip's bus at calculation time.

## Formulas

```
litresPer100km       = litres / distanceKm * 100
litresPerPassengerKm = litres / (distanceKm * passengersCarried)
occupancyPct         = passengersCarried / busCapacity * 100
co2Kg                = litres * factor.kgCo2PerLitre
co2KgPerPassengerKm  = co2Kg / (distanceKm * passengersCarried)
```

Values are rounded for presentation (2 decimals) but computed at full precision.

## Emission factors

Seeded factors:

| Fuel | kg CO₂ per litre | Source | Scope |
|---|---|---|---|
| Diesel | 2.68 | IPCC 2006 Guidelines, Vol. 2, Ch. 3, Table 3.2.1 — default CO₂ factor for gas/diesel oil | Direct combustion, tank-to-wheel (Scope 1) |
| Petrol | 2.31 | IPCC 2006 Guidelines, Vol. 2, Ch. 3, Table 3.2.1 — default CO₂ factor for motor gasoline | Direct combustion, tank-to-wheel (Scope 1) |

Notes:

- These are **illustrative defaults** for a prototype, not Zambia-specific measurements.
  Real deployments should replace them with national or supplier-specific factors.
- The scope is **direct operational combustion only**. Well-to-tank, fuel production and
  upstream emissions are excluded, so totals must not be presented as lifecycle emissions.
- Electric, hybrid and CNG trips have no seeded factor. GreenTrack returns
  `co2Kg: null` with `dataStatus: "MISSING_EMISSION_FACTOR"` rather than guessing.
- Factors are versioned by `effectiveFrom`. The calculation picks the factor active on the
  trip date.

## Guard rails in the calculator

| Situation | Result |
|---|---|
| `distanceKm <= 0` or missing | efficiency metrics `null`, `dataStatus: MISSING_DISTANCE` |
| `passengers = 0` | per-passenger metrics `null`, note `noPassengers` |
| no fuel record | `dataStatus: MISSING_FUEL_RECORD`, no emissions value |
| unknown fuel factor | `dataStatus: MISSING_EMISSION_FACTOR`, `co2Kg: null` |
| fuel type mismatch between bus and record | `dataStatus: FUEL_TYPE_MISMATCH`, calculation still returned with a warning |

Division by zero can never produce `Infinity` or `NaN` in a response.

## Report scopes

| Scope | Aggregation |
|---|---|
| Trip | Single trip metrics from its fuel record |
| Bus | Sum litres/CO₂ and distance across trips; weighted average efficiency |
| Route | Same as bus, grouped by route |
| Operator | Totals plus per-route and per-bus breakdown, period-filtered |

Aggregates are computed as `sum(litres) / sum(distance) * 100` (not an average of averages).

## Example response

```json
{
  "tripId": "cm...",
  "fuelType": "DIESEL",
  "litresConsumed": 128.5,
  "distanceKm": 470,
  "passengersCarried": 38,
  "busCapacity": 44,
  "metrics": {
    "litresPer100km": 27.34,
    "litresPerPassengerKm": 0.0072,
    "occupancyPct": 86.36,
    "co2Kg": 344.38,
    "co2KgPerPassengerKm": 0.0193
  },
  "emissionFactor": {
    "fuelType": "DIESEL",
    "kgCo2PerLitre": 2.68,
    "source": "IPCC 2006 Guidelines, Vol. 2, Ch. 3, Table 3.2.1",
    "scope": "Direct combustion (tank-to-wheel, Scope 1)"
  },
  "methodologyVersion": "1.0.0",
  "isEstimate": true,
  "dataStatus": "COMPLETE",
  "interpretation": "Estimated direct CO2 emissions from recorded fuel use. Occupancy is shown for context and does not by itself demonstrate an emissions reduction."
}
```

## Frontend copy rules

- Say **"estimated CO₂ emissions"**, never "emissions saved" or "verified reduction".
- Show the source and scope alongside any factor displayed to a user.
- When `dataStatus` is not `COMPLETE`, show "no data" instead of a zero.
- Do not rank operators by emissions alone without showing distance, passengers and
  occupancy.
