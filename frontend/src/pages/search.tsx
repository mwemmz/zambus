import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { cx, fmtMoney, label } from '../lib/format';
import {
  buildSearchParams,
  readSearchValues,
  SearchBar,
  todayISO,
  type SearchValues,
} from '../components/SearchBar';
import type { TripSearchResult } from '../lib/types';
import { Badge, Button, Empty, ErrorBox, LiveBadge, Loading } from '../components/ui';

function timeOnly(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(from?: string, to?: string): string {
  if (!from || !to) return '—';
  const minutes = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${(minutes % 60).toString().padStart(2, '0')}m`;
}

function dayChips(): { iso: string; label: string }[] {
  const chips = [
    { iso: todayISO(0), label: 'Today' },
    { iso: todayISO(1), label: 'Tomorrow' },
  ];
  for (let offset = 2; offset < 6; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    chips.push({
      iso: todayISO(offset),
      label: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
    });
  }
  return chips;
}

export function SearchResultsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const values = readSearchValues(params);
  const chips = useMemo(dayChips, []);
  // On phones the full search form is collapsed behind a summary row so the
  // results stay above the fold; the desktop bar is always visible (CSS).
  const [editing, setEditing] = useState(false);

  const query = useMemo(() => {
    const api_params = new URLSearchParams();
    if (values.from.trim()) api_params.set('origin', values.from.trim());
    if (values.to.trim()) api_params.set('destination', values.to.trim());
    if (values.date) api_params.set('travelDate', values.date);
    if (values.sort) api_params.set('filter', values.sort);
    api_params.set('limit', '20');
    return api_params.toString();
  }, [values.from, values.to, values.date, values.sort]);

  const trips = useFetch(() => api<TripSearchResult>(`/trips?${query}`), [query], { refreshMs: 15_000 });

  const apply = (next: SearchValues) => {
    setParams(buildSearchParams(next), { replace: true });
  };

  const setSort = (sort: '' | 'lowestPrice') => apply({ ...values, sort });

  const results = trips.data?.trips ?? [];
  const heading = values.from || values.to
    ? `${values.from || 'Anywhere'} → ${values.to || 'Anywhere'}`
    : 'All upcoming departures';

  return (
    <div className="search-page">
      <div className={cx('search-page-bar', editing && 'is-editing')}>
        <div className="search-summary">
          <div className="search-summary-text">
            <span className="search-summary-route">
              {values.from || 'Anywhere'} → {values.to || 'Anywhere'}
            </span>
            <span className="muted small">
              {values.date
                ? new Date(`${values.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Any date'}{' '}
              · {values.pax} {values.pax === 1 ? 'passenger' : 'passengers'}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Change
          </Button>
        </div>

        <SearchBar
          initial={values}
          onSubmit={(next) => {
            apply(next);
            setEditing(false);
          }}
          variant="inline"
          submitLabel="Update search"
        />
      </div>

      <div className="search-page-body">
        <div className="search-head">
          <div>
            <h1 className="search-title">{heading}</h1>
            <p className="muted small">
              {values.date
                ? new Date(`${values.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'All dates'}{' '}
              · {values.pax} {values.pax === 1 ? 'passenger' : 'passengers'}
            </p>
          </div>
          <div className="row-actions">
            <LiveBadge refreshing={trips.refreshing} />
            <div className="sort-toggle">
              <button
                type="button"
                className={cx('sort-btn', !values.sort && 'sort-btn-active')}
                onClick={() => setSort('')}
              >
                Earliest
              </button>
              <button
                type="button"
                className={cx('sort-btn', values.sort === 'lowestPrice' && 'sort-btn-active')}
                onClick={() => setSort('lowestPrice')}
              >
                Cheapest
              </button>
            </div>
          </div>
        </div>

        <div className="date-strip">
          <button
            type="button"
            className={cx('date-chip', !values.date && 'date-chip-active')}
            onClick={() => apply({ ...values, date: '' })}
          >
            Any date
          </button>
          {chips.map((chip) => (
            <button
              key={chip.iso}
              type="button"
              className={cx('date-chip', values.date === chip.iso && 'date-chip-active')}
              onClick={() => apply({ ...values, date: chip.iso })}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {trips.loading && <Loading text="Searching departures…" />}
        {trips.error && <ErrorBox error={trips.error} onRetry={trips.reload} />}

        {!trips.loading && !trips.error && results.length === 0 && (
          <Empty
            title="No departures match this search"
            hint="Try another date, or clear the origin and destination filters."
            action={
              <Button variant="ghost" onClick={() => navigate('/search')}>
                Clear filters
              </Button>
            }
          />
        )}

        <div className="journey-list">
          {results.map((trip) => {
            const seatsLeft = trip.remainingSeats ?? 0;
            const soldOut = seatsLeft <= 0;
            const enough = seatsLeft >= values.pax;

            return (
              <article key={trip.tripId} className={cx('journey-row', soldOut && 'journey-row-soldout')}>
                <div className="journey-times">
                  <div className="journey-endpoint">
                    <strong>{timeOnly(trip.departureTime)}</strong>
                    <span className="muted small">{trip.route?.origin}</span>
                  </div>
                  <div className="journey-duration">
                    <span className="journey-dot" />
                    <span className="journey-line" />
                    <span className="muted small">
                      {durationLabel(trip.departureTime, trip.estimatedArrival)}
                    </span>
                    <span className="journey-line" />
                    <span className="journey-dot" />
                  </div>
                  <div className="journey-endpoint">
                    <strong>{timeOnly(trip.estimatedArrival)}</strong>
                    <span className="muted small">{trip.route?.destination}</span>
                  </div>
                </div>

                <div className="journey-meta">
                  <span className="journey-route">{trip.route?.routeName ?? 'Intercity'}</span>
                  <div className="chips">
                    <Badge tone="primary">{trip.busCategory ?? 'Standard'}</Badge>
                    <Badge>{trip.bus?.model ?? 'Coach'}</Badge>
                    <Badge tone={soldOut ? 'danger' : seatsLeft < 6 ? 'warning' : 'success'}>
                      {soldOut ? 'Sold out' : `${seatsLeft} seats left`}
                    </Badge>
                    {trip.status !== 'SCHEDULED' && <Badge tone="info">{label(trip.status)}</Badge>}
                  </div>
                </div>

                <div className="journey-buy">
                  <div className="journey-price">
                    {fmtMoney(trip.fareAmount)}
                    <span className="muted small">per seat</span>
                  </div>
                  <Link
                    className={cx('btn btn-primary btn-lg', (!enough || soldOut) && 'btn-disabled')}
                    aria-disabled={!enough || soldOut}
                    to={enough && !soldOut ? `/trips/${trip.tripId}?pax=${values.pax}` : '/search'}
                    onClick={(event) => {
                      if (!enough || soldOut) event.preventDefault();
                    }}
                  >
                    {soldOut ? 'Sold out' : enough ? 'Select seats' : `Only ${seatsLeft} left`}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {results.length > 0 && (
          <p className="muted small search-foot">
            Showing {results.length} of {trips.data?.total ?? results.length} departures. Fares are per seat
            and held for 10 minutes once selected.
          </p>
        )}
      </div>
    </div>
  );
}
