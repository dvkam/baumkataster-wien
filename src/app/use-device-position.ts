import { useCallback, useEffect, useRef, useState } from "react";

import type { Position } from "../geo";

export type DevicePosition =
  | { readonly kind: "off" }
  | { readonly kind: "unsupported" }
  | { readonly kind: "locating" }
  | { readonly kind: "located"; readonly position: Position; readonly accuracyMeters: number }
  | { readonly kind: "denied" }
  /** Temporarily unavailable or timed out; the device keeps trying. */
  | { readonly kind: "unavailable" };

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
};

/** Feature detection: some browsers and embedded views ship without the Geolocation API. */
function hasGeolocation(): boolean {
  const geolocation: unknown = Reflect.get(navigator, "geolocation");
  return typeof geolocation === "object" && geolocation !== null && "watchPosition" in geolocation;
}

/** Follows the device's Position after `start()` until `stop()`; never asks for permission on its own. */
export function useDevicePosition(): {
  readonly device: DevicePosition;
  readonly start: () => void;
  readonly stop: () => void;
} {
  const [device, setDevice] = useState<DevicePosition>(() =>
    hasGeolocation() ? { kind: "off" } : { kind: "unsupported" },
  );
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setDevice({ kind: "off" });
  }, []);

  const start = useCallback(() => {
    if (watchId.current !== null) return;
    if (!hasGeolocation()) {
      setDevice({ kind: "unsupported" });
      return;
    }
    setDevice({ kind: "locating" });
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setDevice({
          kind: "located",
          position: { latitude: coords.latitude, longitude: coords.longitude },
          accuracyMeters: coords.accuracy,
        });
      },
      (error) => {
        if (error.code !== error.PERMISSION_DENIED) {
          setDevice((previous) =>
            previous.kind === "located" ? previous : { kind: "unavailable" },
          );
          return;
        }
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setDevice({ kind: "denied" });
      },
      WATCH_OPTIONS,
    );
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { device, start, stop };
}
