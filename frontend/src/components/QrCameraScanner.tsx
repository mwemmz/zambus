import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import jsQR from 'jsqr';
import { Button, Notice, Select } from './ui';
import { cx } from '../lib/format';

const MAX_SCAN_WIDTH = 800;
const SCAN_INTERVAL_MS = 100;

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera permission was denied. Tap the lock/info icon in the address bar → Permissions → Camera → Allow, then reload. If you opened this link inside WhatsApp, Instagram, Facebook or another in-app browser, open it in Safari or Chrome instead.';
      case 'NotFoundError':
        return 'No camera was found on this device. Use “Upload QR image” or enter the payload manually.';
      case 'NotReadableError':
        return 'The camera is busy in another app. Close the other app and try again.';
      case 'OverconstrainedError':
        return 'That camera is not available. Pick another camera from the list.';
      case 'SecurityError':
        return 'Camera access is blocked. Use HTTPS (the Cloudflare URL) or open the app on localhost.';
      default:
        return `Could not start the camera (${error.name}). Use “Upload QR image” or enter the payload manually.`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Could not start the camera.';
}

interface QrCameraScannerProps {
  onScan: (data: string) => void;
  busy?: boolean;
}

export function QrCameraScanner({ onScan, busy = false }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const lockedRef = useRef(false);
  const startIdRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [lastErrorName, setLastErrorName] = useState<string | null>(null);

  const locationOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const secure = typeof window !== 'undefined' ? window.isSecureContext : true;
  const isLocalhost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const needsHttps = !secure && !isLocalhost;
  const mediaDevicesAvailable = Boolean(navigator.mediaDevices?.getUserMedia);
  const inAppBrowser =
    typeof navigator !== 'undefined' &&
    /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|Snapchat|Pinterest/i.test(navigator.userAgent);

  let inIframe = false;
  try {
    inIframe = typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    lockedRef.current = false;
    lastFrameRef.current = 0;
    setActive(false);
    setStarting(false);
  }, []);

  useEffect(() => {
    return () => {
      startIdRef.current += 1;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === 'hidden' && streamRef.current) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, [stopCamera]);

  const scanFrame = useCallback(
    (time: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !streamRef.current || lockedRef.current) return;

      if (time - lastFrameRef.current < SCAN_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      lastFrameRef.current = time;

      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      const code = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });

      if (code?.data) {
        lockedRef.current = true;
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        navigator.vibrate?.(120);
        stopCamera();
        onScanRef.current(code.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    },
    [stopCamera],
  );

  const startCamera = useCallback(
    async (requestedDeviceId?: string) => {
      if (!secure) {
        setError(
          `Camera access requires HTTPS. This page is running on ${locationOrigin}. Open the Cloudflare https://…trycloudflare.com URL on this phone — do not use the http:// LAN address.`,
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'This browser does not expose a camera API. Open the page directly in Safari or Chrome — not inside WhatsApp, Instagram, Facebook or another in-app browser — then press Start camera again.',
        );
        return;
      }

      stopCamera();
      const startId = startIdRef.current + 1;
      startIdRef.current = startId;
      setStarting(true);
      setError(null);
      setFileError(null);
      setLastErrorName(null);
      lockedRef.current = false;
      lastFrameRef.current = 0;

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: requestedDeviceId
            ? { deviceId: { exact: requestedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        });

        if (startId !== startIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('The camera preview is not ready yet.');

        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        await video.play().catch(() => undefined);

        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
            return;
          }
          const onLoaded = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoaded);
          window.setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          }, 2000);
        });

        if (startId !== startIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.deviceId) {
          setDeviceId(settings.deviceId);
        }

        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          setDevices(allDevices.filter((device) => device.kind === 'videoinput'));
        } catch {
          // Device labels are optional; the active camera still works.
        }

        setStarting(false);
        setActive(true);

        if (video.paused) {
          setError(
            'Camera access was granted, but the preview is paused. Tap the camera preview or press Retry. On iPhone, opening the link in Safari usually fixes this.',
          );
        }

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('[camera] getUserMedia failed:', err);
        if (startId === startIdRef.current) {
          setLastErrorName(err instanceof DOMException ? err.name : 'UnknownError');
          setError(cameraErrorMessage(err));
          setStarting(false);
          setActive(false);
        }
        stream?.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) {
          streamRef.current = null;
        }
      }
    },
    [scanFrame, secure, stopCamera],
  );

  const changeCamera = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDeviceId = event.target.value;
    setDeviceId(nextDeviceId);
    if (active) {
      void startCamera(nextDeviceId);
    }
  };

  const scanImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileError(null);
    setError(null);
    stopCamera();

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Image decoder is not ready.');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Image decoder is not ready.');

      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const image = context.getImageData(0, 0, width, height);
      const code = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });

      if (!code?.data) {
        setFileError('No QR code was found in that image. Try a clearer photo or a full-size screenshot.');
        return;
      }

      navigator.vibrate?.(120);
      onScanRef.current(code.data);
    } catch {
      setFileError('That image could not be read. Try a PNG or JPG screenshot of the ticket.');
    }
  };

  const statusText = starting
    ? 'Waiting for camera permission…'
    : active
      ? 'Scanning — point the rear camera at the passenger QR code.'
      : 'Camera is off. Start it when the passenger is ready.';

  return (
    <div className="camera-scanner">
      {needsHttps && (
        <Notice tone="danger" title="Camera is blocked on this address">
          You are on <code>{locationOrigin}</code>, which is plain HTTP. Mobile browsers only allow camera access
          over HTTPS or on localhost. Open this same page using the Cloudflare <strong>https://…trycloudflare.com</strong>{' '}
          address on your phone, or use “Take photo” / “Upload QR image” below.
        </Notice>
      )}

      {inAppBrowser && (
        <Notice tone="warning" title="In-app browser detected">
          Camera access is usually blocked inside WhatsApp, Instagram, Facebook and similar apps. Tap the browser
          menu and choose “Open in Safari” or “Open in Chrome”, then allow camera access.
        </Notice>
      )}

      {inIframe && (
        <Notice tone="warning" title="Embedded page detected">
          This page is running inside another app or frame. Open the URL directly in Safari or Chrome so the
          browser can request camera permission.
        </Notice>
      )}

      {!mediaDevicesAvailable && !needsHttps && (
        <Notice tone="warning" title="Camera API unavailable">
          This browser does not expose a camera API. Open the page in Safari or Chrome, or use “Take photo” below.
        </Notice>
      )}

      <div className={cx('camera-stage', (active || starting) && 'camera-stage-active')}>
        <video
          ref={videoRef}
          className="camera-video"
          playsInline
          muted
          autoPlay
          onClick={() => {
            void videoRef.current?.play().catch(() => undefined);
          }}
        />
        {!active && !starting && (
          <div className="camera-placeholder">
            <span className="camera-placeholder-icon">⌁</span>
            <strong>Camera preview</strong>
            <span className="muted small">Start the camera to scan a passenger ticket.</span>
          </div>
        )}
        {(active || starting) && (
          <div className="scan-frame" aria-hidden="true">
            <span className="scan-corner scan-corner-tl" />
            <span className="scan-corner scan-corner-tr" />
            <span className="scan-corner scan-corner-bl" />
            <span className="scan-corner scan-corner-br" />
            {active && <span className="scan-line" />}
          </div>
        )}
        {starting && (
          <div className="camera-overlay">Starting camera — allow camera access in the browser prompt.</div>
        )}
      </div>

      <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />

      <div className="camera-status">
        <span className={cx('live-dot', active && 'live-dot-busy')} />
        <span>{statusText}</span>
      </div>

      {error && (
        <>
          <Notice tone="danger" title="Camera error">{error}</Notice>
          {lastErrorName === 'NotAllowedError' && (
            <p className="muted small">
              iPhone: Settings → Safari → Camera → Allow. Android Chrome: lock icon → Permissions → Camera → Allow.
              Then reload this page and press Start camera again.
            </p>
          )}
        </>
      )}
      {fileError && <Notice tone="danger" title="Image scan failed">{fileError}</Notice>}

      <div className="camera-actions">
        {active ? (
          <Button type="button" variant="danger" onClick={stopCamera}>
            Stop camera
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void startCamera()}
            disabled={starting || busy}
          >
            {starting ? 'Starting…' : 'Start camera'}
          </Button>
        )}

        {error && !active && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => void startCamera()}>
              Retry camera
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => captureInputRef.current?.click()}
            >
              Open phone camera
            </Button>
          </>
        )}

        <label className="btn btn-ghost btn-sm file-btn">
          Upload QR image
          <input type="file" accept="image/*" onChange={scanImageFile} hidden />
        </label>
        <label className="btn btn-ghost btn-sm file-btn">
          Take photo
          <input
            ref={captureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={scanImageFile}
            hidden
          />
        </label>
      </div>

      {devices.length > 1 && (
        <Select value={deviceId} onChange={changeCamera} aria-label="Camera">
          {devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </Select>
      )}

      <p className="muted small">
        Scanning stops automatically when a QR code is detected and the ticket is validated. Hold the phone about
        10–20 cm from the QR code. If the passenger's screen is dim, increase the brightness or use the image
        upload fallback.
      </p>

      <details className="camera-diagnostics">
        <summary>Camera diagnostics</summary>
        <div>Address: <code>{locationOrigin}</code></div>
        <div>Secure context: <code>{secure ? 'yes' : 'no'}</code></div>
        <div>MediaDevices API: <code>{mediaDevicesAvailable ? 'yes' : 'no'}</code></div>
        <div>Camera permission: <code>ask when you press Start camera</code></div>
        <div>Last camera error: <code>{lastErrorName || 'none'}</code></div>
        <div>Browser: <code>{typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}</code></div>
      </details>
    </div>
  );
}
