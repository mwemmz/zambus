import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { TripSearchResult } from '../lib/types';
import { Button } from './ui';

export interface SearchValues {
  from: string;
  to: string;
  date: string;
  pax: number;
  sort: '' | 'lowestPrice';
}

export function todayISO(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function readSearchValues(params: URLSearchParams): SearchValues {
  const pax = Number(params.get('pax') ?? 1);
  const sort = params.get('sort');
  return {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    date: params.get('date') ?? '',
    pax: Number.isFinite(pax) && pax > 0 ? Math.min(pax, 6) : 1,
    sort: sort === 'lowestPrice' ? 'lowestPrice' : '',
  };
}

export function buildSearchParams(values: SearchValues): URLSearchParams {
  const params = new URLSearchParams();
  if (values.from.trim()) params.set('from', values.from.trim());
  if (values.to.trim()) params.set('to', values.to.trim());
  if (values.date) params.set('date', values.date);
  if (values.pax > 1) params.set('pax', String(values.pax));
  if (values.sort) params.set('sort', values.sort);
  return params;
}

/** Cheap city autocomplete: the distinct route endings already on sale. */
export function useKnownPlaces() {
  const [places, setPlaces] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<TripSearchResult>('/trips?limit=50&includePast=true')
      .then((result) => {
        if (cancelled) return;
        const names = new Set<string>();
        result.trips.forEach((trip) => {
          if (trip.route?.origin) names.add(trip.route.origin);
          if (trip.route?.destination) names.add(trip.route.destination);
        });
        setPlaces([...names].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        /* autocomplete is a nicety — never block the form on it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return places;
}

export function SearchBar({
  initial,
  onSubmit,
  variant = 'hero',
  submitLabel = 'Search trips',
}: {
  initial: SearchValues;
  onSubmit: (values: SearchValues) => void;
  variant?: 'hero' | 'inline';
  submitLabel?: string;
}) {
  const [values, setValues] = useState<SearchValues>(initial);
  const places = useKnownPlaces();

  // Keep the form in sync when the URL changes underneath us (back button).
  useEffect(() => {
    setValues(initial);
  }, [initial.from, initial.to, initial.date, initial.pax, initial.sort]);

  const listId = useMemo(() => `places-${Math.random().toString(36).slice(2, 8)}`, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  const swap = () => setValues((current) => ({ ...current, from: current.to, to: current.from }));

  return (
    <form className={variant === 'hero' ? 'search-bar' : 'search-bar search-bar-inline'} onSubmit={submit}>
      <datalist id={listId}>
        {places.map((place) => (
          <option key={place} value={place} />
        ))}
      </datalist>

      <div className="search-field search-field-grow">
        <label htmlFor={`${listId}-from`}>From</label>
        <input
          id={`${listId}-from`}
          className="search-input"
          list={listId}
          placeholder="Lusaka"
          value={values.from}
          onChange={(event) => setValues({ ...values, from: event.target.value })}
        />
      </div>

      <button type="button" className="search-swap" onClick={swap} aria-label="Swap origin and destination">
        ⇄
      </button>

      <div className="search-field search-field-grow">
        <label htmlFor={`${listId}-to`}>To</label>
        <input
          id={`${listId}-to`}
          className="search-input"
          list={listId}
          placeholder="Livingstone"
          value={values.to}
          onChange={(event) => setValues({ ...values, to: event.target.value })}
        />
      </div>

      <div className="search-field">
        <label htmlFor={`${listId}-date`}>Departure</label>
        <input
          id={`${listId}-date`}
          className="search-input"
          type="date"
          value={values.date}
          onChange={(event) => setValues({ ...values, date: event.target.value })}
        />
      </div>

      <div className="search-field search-field-pax">
        <label htmlFor={`${listId}-pax`}>Passengers</label>
        <select
          id={`${listId}-pax`}
          className="search-input"
          value={values.pax}
          onChange={(event) => setValues({ ...values, pax: Number(event.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'passenger' : 'passengers'}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" className="search-submit">
        {submitLabel}
      </Button>
    </form>
  );
}
