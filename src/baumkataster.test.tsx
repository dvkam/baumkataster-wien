import { RouterProvider } from "@tanstack/react-router";
// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "./app-router.tsx";
import { createCatalog } from "./catalog";
import { rawCollection, rawTree } from "./trees/fixtures.ts";
import { ErrorBoundary } from "./ui";

vi.mock("./map", () => ({ TreeMap: () => <div aria-label="Interaktive Baumkarte" /> }));

type Fetch = typeof globalThis.fetch;

const stephansdom = { latitude: 48.208_49, longitude: 16.373_08 };

const spitzahorn = rawTree(
  { OBJECTID: 1, BAUMNUMMER: "1026", BEZIRK: 1, GATTUNG_ART: "Acer platanoides (Spitzahorn)" },
  [16.373_08, 48.209_39],
);
const winterlinde = rawTree(
  { OBJECTID: 2, BAUMNUMMER: "1026", BEZIRK: 21, GATTUNG_ART: "Tilia cordata (Winterlinde)" },
  [16.373_08, 48.212_99],
);

function cqlOf(input: Parameters<Fetch>[0]): string {
  const url = new URL(input instanceof Request ? input.url : String(input), "https://app.invalid");
  return url.searchParams.get("CQL_FILTER") ?? "";
}

const treesById = new Map([
  ["1", spitzahorn],
  ["2", winterlinde],
]);

/** A stand-in for the city's WFS: answers a Tree id with that Tree, anything else with both. */
function fakeWfs() {
  return vi.fn<Fetch>((input) => {
    const id = /^OBJECTID=(?<id>\d+)$/u.exec(cqlOf(input))?.groups?.["id"];
    const features = id === undefined ? [...treesById.values()] : [treesById.get(id)];
    return Promise.resolve(Response.json(rawCollection(features)));
  });
}

function fakeGeolocation(position = stephansdom) {
  const geolocation = {
    watchPosition: vi.fn<Geolocation["watchPosition"]>((success) => {
      queueMicrotask(() => {
        success({
          coords: { ...position, accuracy: 8 },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });
      return 1;
    }),
    clearWatch: vi.fn<Geolocation["clearWatch"]>(),
    getCurrentPosition: vi.fn<Geolocation["getCurrentPosition"]>(),
  };
  Object.defineProperty(navigator, "geolocation", { value: geolocation, configurable: true });
  return geolocation;
}

async function open(address: string, fetch: Fetch = fakeWfs()) {
  window.history.replaceState(null, "", address);
  const router = createAppRouter(createCatalog({ baseUrl: "/ogd", fetch }));
  await router.load();
  render(<RouterProvider router={router} />);
  return { fetch, user: userEvent.setup() };
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Baumkataster", () => {
  it("searches a German species name and keeps it in the URL", async () => {
    const fetch = fakeWfs();
    const { user } = await open("/", fetch);
    await user.selectOptions(screen.getByLabelText("Suchart"), "species");
    await user.type(screen.getByLabelText("Baumart"), "Ahorn{Enter}");
    expect(await screen.findByText('2 Bäume für "Ahorn" in Wien')).toBeDefined();
    expect(window.location.search).toBe("?art=Ahorn");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("GATTUNG_ART+ILIKE+%27%25Ahorn%25%27"),
      expect.anything(),
    );
  });

  it("finds a landmark on submit and searches trees at the selected place", async () => {
    const geocode = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        Response.json({
          features: [
            {
              geometry: { type: "Point", coordinates: [16.39416, 48.20717] },
              properties: {
                osm_id: 1,
                osm_type: "N",
                name: "Hundertwasserhaus",
                street: "Kegelgasse",
                city: "Wien",
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", geocode);
    const { user } = await open("/");
    await user.type(screen.getByLabelText("Ort oder Adresse"), "Hundertwasserhaus");
    expect(geocode).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Suchen" }));
    await user.click(await screen.findByRole("button", { name: /Hundertwasserhaus Kegelgasse/u }));
    expect(window.location.search).toBe("?nahe=48.20717%2C16.39416");
  });

  it("retries an empty response instead of reusing its cached result", async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json(rawCollection([])))
      .mockResolvedValueOnce(Response.json(rawCollection([spitzahorn])));
    const { user } = await open("/?nummer=1026", fetch);
    await user.click(await screen.findByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("1 Baum mit Nr. 1026")).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("explores a named place without asking for the device location", async () => {
    const geolocation = fakeGeolocation();
    const { user } = await open("/");
    await user.click(screen.getByRole("link", { name: /Beim Hundertwasserhaus/u }));
    expect(window.location.search).toContain("nahe=48.20717%2C16.39416");
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it("starts with an introduction and asks nothing of the WFS", async () => {
    const { fetch } = await open("/");
    expect(screen.getByRole("heading", { name: "Welcher Baum ist das?" })).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("restores a Tree number search from the address", async () => {
    await open("/?nummer=1026");
    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
    const list = screen.getByRole("list", { name: "Bäume" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([expect.stringContaining("Spitzahorn"), expect.stringContaining("Winterlinde")]);
  });

  it("searches a typed Tree number and writes it into the address", async () => {
    const { user } = await open("/");
    await user.selectOptions(screen.getByLabelText("Suchart"), "number");
    await user.type(screen.getByLabelText("Baumnummer"), "1026");
    await user.click(screen.getByRole("button", { name: "Suchen" }));

    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
    expect(window.location.search).toBe("?nummer=1026");
  });

  it("refuses a Tree number that can't be on a tag", async () => {
    const { user, fetch } = await open("/");
    await user.selectOptions(screen.getByLabelText("Suchart"), "number");
    await user.type(screen.getByLabelText("Baumnummer"), "'; DROP");
    await user.click(screen.getByRole("button", { name: "Suchen" }));

    expect(screen.getByLabelText("Baumnummer").getAttribute("aria-invalid")).toBe("true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists the Trees around the device, nearest first, after 'In meiner Nähe'", async () => {
    fakeGeolocation();
    const { user } = await open("/");
    await user.click(screen.getByRole("button", { name: "In meiner Nähe" }));

    expect(await screen.findByText("2 Bäume im Umkreis von 1 km")).toBeDefined();
    expect(window.location.search).toBe("?nahe=48.20849%2C16.37308");
    const cards = within(screen.getByRole("list", { name: "Bäume" })).getAllByRole("link");
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringMatching(/Spitzahorn.*100 m/u),
      expect.stringMatching(/Winterlinde.*500 m/u),
    ]);
  });

  it("narrows a city-wide Tree number search to the device's surroundings on 'In meiner Nähe'", async () => {
    fakeGeolocation();
    const { user } = await open("/");
    await user.click(screen.getByRole("button", { name: "In meiner Nähe" }));
    await user.click(await screen.findByRole("link", { name: /Spitzahorn/u }));
    await user.click(await screen.findByRole("link", { name: "Alle mit Nr. 1026" }));

    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "In meiner Nähe" }).getAttribute("aria-pressed"),
    ).toBe("false");

    await user.click(screen.getByRole("button", { name: "In meiner Nähe" }));
    expect(window.location.search).toBe("?nahe=48.20849%2C16.37308&nummer=1026");
    expect(
      screen.getByRole("button", { name: "In meiner Nähe" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("disables 'In meiner Nähe' on a device without geolocation", async () => {
    Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
    await open("/");
    expect(screen.getByRole("button", { name: "In meiner Nähe" })).toHaveProperty("disabled", true);
  });

  it("opens a Tree and comes back to the list without asking again", async () => {
    const { user, fetch } = await open("/?nummer=1026");
    await user.click(await screen.findByRole("link", { name: /Spitzahorn/u }));

    expect(await screen.findByRole("heading", { name: "Spitzahorn" })).toBeDefined();
    expect(window.location.search).toBe("?baum=1");

    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("shows the error boundary instead of a blank page when something unexpected breaks", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/?nummer=1");
    const router = createAppRouter({ lookup: () => Promise.reject(new RangeError("bug")) });
    await router.load();
    render(
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>,
    );
    expect(await screen.findByText("Etwas ist schiefgegangen.")).toBeDefined();
  });

  it("asks again when coming back to a Search that had failed", async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementation(fakeWfs());
    const { user } = await open("/?nummer=1026", fetch);
    expect(await screen.findByText("Der Baumkataster ist gerade nicht erreichbar.")).toBeDefined();

    await user.type(screen.getByLabelText("Baumnummer"), "{Backspace>4}7{Enter}");
    expect(await screen.findByText("2 Bäume mit Nr. 7")).toBeDefined();
    window.history.back();
    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
  });

  it("explains a failure and recovers on retry", async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementation(fakeWfs());
    const { user } = await open("/?nummer=1026", fetch);

    expect(await screen.findByText("Der Baumkataster ist gerade nicht erreichbar.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("2 Bäume mit Nr. 1026")).toBeDefined();
  });
});
