import { useCallback, useEffect, useRef } from "react";

import { distanceMeters } from "../geo";
import { nearby, treeNumberOf } from "../search";
import type { Search } from "../search";
import { useDevicePosition } from "./use-device-position.ts";
import type { DevicePosition } from "./use-device-position.ts";
import type { Navigate } from "./use-search.ts";

/** How far the device has to move before a Nearby search follows it. */
const REFETCH_THRESHOLD_METERS = 100;

/**
 * Turns the device's Position into Nearby searches:
 * - `locate()` starts a Nearby search at the next Position fix, keeping any Tree number;
 * - while a Nearby search is on screen, it follows the device once it moved more than
 *   the Refetch threshold (replacing the history entry, so back skips the small steps);
 * - opening a Tree pauses following; coming back resumes it.
 * `following` is what the "In meiner Nähe" control shows: the device is being watched and the
 * screen is (or is about to be) a Nearby search.
 */
export function useNearby(
  search: Search,
  navigate: Navigate,
): {
  readonly device: DevicePosition;
  readonly following: boolean;
  readonly locate: () => void;
  readonly stop: () => void;
} {
  const { device, start, stop } = useDevicePosition();
  const wantsNearby = useRef(false);

  const locate = useCallback(() => {
    if (device.kind === "located") {
      navigate(nearby(device.position, treeNumberOf(search)));
      return;
    }
    wantsNearby.current = true;
    start();
  }, [device, navigate, search, start]);

  useEffect(() => {
    if (device.kind !== "located") return;
    if (wantsNearby.current) {
      wantsNearby.current = false;
      navigate(nearby(device.position, treeNumberOf(search)));
      return;
    }
    if (search.kind !== "nearby") return;
    if (distanceMeters(search.near, device.position) <= REFETCH_THRESHOLD_METERS) return;
    navigate(nearby(device.position, search.treeNumber), "replace");
  }, [device, navigate, search]);

  const stopFollowing = useCallback(() => {
    wantsNearby.current = false;
    stop();
  }, [stop]);

  const watching =
    device.kind === "locating" || device.kind === "located" || device.kind === "unavailable";
  const following = watching && (device.kind !== "located" || search.kind === "nearby");

  return { device, following, locate, stop: stopFollowing };
}
