import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { errorMessage } from '../lib/api';
import { cx } from '../lib/format';
import { Button, Field, Notice } from './ui';

/**
 * Mock mobile-money payment.
 *
 * Flow: the passenger types the wallet number → we "send" a payment prompt to
 * that handset → an on-screen prompt collects the 4-digit PIN → the booking is
 * confirmed and the QR ticket is generated.
 *
 * No PIN is ever verified: any 4 digits approve the charge.
 */

/** `+260977123456` → `+260 97 ••• 3456` */
export function maskMobile(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return value;
  const prefix = value.trim().startsWith('+') ? '+' : '';
  return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 5)} ••• ${digits.slice(-4)}`;
}

export function MobileMoneyPayment({
  amountLabel,
  routeLabel,
  seatNumber,
  onApprove,
  onCancelBooking,
  cancelDisabled,
}: {
  amountLabel: string;
  routeLabel: string;
  seatNumber: number;
  onApprove: (mobileNumber: string, pin: string) => Promise<unknown>;
  onCancelBooking: () => void;
  cancelDisabled?: boolean;
}) {
  const [mobile, setMobile] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);

  const digits = mobile.replace(/\D/g, '');
  const mobileValid = digits.length >= 9 && digits.length <= 15;

  const sendPrompt = (event: FormEvent) => {
    event.preventDefault();
    if (!mobileValid) return;
    setPromptOpen(true);
  };

  return (
    <>
      <form className="mobile-money" onSubmit={sendPrompt}>
        <Field
          label="Mobile money number"
          required
          hint="We send the payment prompt to this handset. Airtel, MTN and Zamtel numbers are supported."
        >
          <div className="phone-input">
            <span className="phone-prefix">+260</span>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="97 123 4567"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
          </div>
        </Field>

        <Button type="submit" disabled={!mobileValid}>
          Send payment prompt
        </Button>
        <p className="muted small">
          A prompt appears on your phone asking you to approve {amountLabel}. Nothing is charged until you
          enter your PIN.
        </p>
        <Button variant="ghost" type="button" disabled={cancelDisabled} onClick={onCancelBooking}>
          Cancel booking
        </Button>
      </form>

      {promptOpen && (
        <PaymentPinPrompt
          amountLabel={amountLabel}
          routeLabel={routeLabel}
          seatNumber={seatNumber}
          payerLabel={maskMobile(`+${digits}`)}
          onApprove={async (pin) => {
            await onApprove(`+${digits}`, pin);
            setPromptOpen(false);
          }}
          onClose={() => setPromptOpen(false)}
        />
      )}
    </>
  );
}

export function PaymentPinPrompt({
  amountLabel,
  routeLabel,
  seatNumber,
  payerLabel,
  onApprove,
  onClose,
}: {
  amountLabel: string;
  routeLabel: string;
  seatNumber: number;
  payerLabel: string;
  onApprove: (pin: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const code = pin.join('');

  const write = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '');
    if (!incoming) return;

    setError(null);
    setPin((current) => {
      const next = [...current];
      // pasting or SMS autofill can drop several digits at once; spread them out
      incoming.split('').forEach((digit, offset) => {
        if (index + offset < next.length) next[index + offset] = digit;
      });
      return next;
    });

    boxes.current[Math.min(index + incoming.length, 3)]?.focus();
  };

  const onBoxKeyDown = (index: number, event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      setError(null);
      const hadDigit = Boolean(pin[index]);
      setPin((current) => {
        const next = [...current];
        if (hadDigit) next[index] = '';
        else if (index > 0) next[index - 1] = '';
        return next;
      });
      boxes.current[Math.max(index - (hadDigit ? 0 : 1), 0)]?.focus();
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 3) boxes.current[index + 1]?.focus();
  };

  const approve = async (event?: FormEvent) => {
    event?.preventDefault();
    if (code.length !== 4 || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onApprove(code);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
      setPin(['', '', '', '']);
      boxes.current[0]?.focus();
    }
  };

  return (
    <div
      className="pin-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        className="pin-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-prompt-title"
        onSubmit={approve}
      >
        <div className="pin-prompt-head">
          <span className="pin-operator">ZamBus Pay</span>
          <span className="muted small">Mobile money</span>
        </div>

        <div className="pin-amount-block">
          <span className="muted small">Approve payment of</span>
          <strong className="pin-amount">{amountLabel}</strong>
        </div>

        <dl className="pin-meta">
          <div>
            <dt>Paying to</dt>
            <dd>ZamBus</dd>
          </div>
          <div>
            <dt>Trip</dt>
            <dd>{routeLabel}</dd>
          </div>
          <div>
            <dt>Seat</dt>
            <dd>Seat {seatNumber}</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>{payerLabel}</dd>
          </div>
        </dl>

        <div className="pin-entry">
          <span className="pin-entry-label" id="pin-prompt-title">
            Enter your 4-digit PIN
          </span>
          <div className="pin-boxes">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  boxes.current[index] = node;
                }}
                className={cx('pin-box', error && 'pin-box-error')}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                aria-label={`PIN digit ${index + 1}`}
                value={digit}
                disabled={submitting}
                onChange={(event) => write(index, event.target.value)}
                onKeyDown={(event) => onBoxKeyDown(index, event)}
              />
            ))}
          </div>
          <span className="muted small">
            {submitting ? 'Approving payment…' : 'Simulated prompt — any 4 digits approve the payment.'}
          </span>
        </div>

        {error && (
          <Notice tone="danger" title="Payment declined">
            {error}
          </Notice>
        )}

        <div className="pin-actions">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Decline
          </Button>
          <Button type="submit" disabled={code.length !== 4 || submitting}>
            {submitting ? 'Approving…' : 'Approve'}
          </Button>
        </div>
      </form>
    </div>
  );
}
