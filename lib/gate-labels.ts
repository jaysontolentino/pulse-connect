import type { Map as MapboxMap, Marker, MarkerOptions } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";

const BOUNDARY_ID = "gate-country-boundaries";
// Points further than this from the view center are on the far side of the
// globe, where a screen-space lookup would hit the country in front of them.
const VISIBLE_ARC_DEG = 80;

type MarkerConstructor = new (options?: MarkerOptions) => Marker;

export interface GateLabels {
  refresh: () => void;
  detach: () => void;
}

export function setLabelVisibility(
  map: MapboxMap,
  visibility: "visible" | "none",
) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type === "symbol") {
      map.setLayoutProperty(layer.id, "visibility", visibility);
    }
  }
}

function arcDegrees(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const cos =
    Math.sin(a.lat * rad) * Math.sin(b.lat * rad) +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.cos((a.lng - b.lng) * rad);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / rad;
}

// The boundaries tileset repeats disputed areas once per worldview.
function inUsWorldview(worldview: unknown): boolean {
  return (
    typeof worldview === "string" &&
    (worldview === "all" || worldview.split(",").includes("US"))
  );
}

// Neighbouring countries' names overlap at globe scale. Place labels in
// priority order and hide any that would overlap one already placed.
function hideCollisions(ordered: Marker[]) {
  const placed: DOMRect[] = [];
  for (const marker of ordered) {
    const el = marker.getElement();
    el.classList.remove("is-collided");
    const box = el.getBoundingClientRect();
    const overlaps = placed.some(
      (p) =>
        box.left < p.right &&
        box.right > p.left &&
        box.top < p.bottom &&
        box.bottom > p.top,
    );
    if (overlaps) el.classList.add("is-collided");
    else placed.push(box);
  }
}

/**
 * Hides the style's labels and names only the countries that hold a visible
 * dot, as HTML markers above the dots. The style's own country labels are
 * not used because the tiles at a phone-sized globe's zoom carry none.
 */
export function attachGateLabels(
  map: MapboxMap,
  getPeers: () => PeerDot[],
  MarkerClass: MarkerConstructor,
): GateLabels {
  const labels = new Map<string, Marker>();

  setLabelVisibility(map, "none");
  map.addSource(BOUNDARY_ID, {
    type: "vector",
    url: "mapbox://mapbox.country-boundaries-v1",
  });
  map.addLayer({
    id: BOUNDARY_ID,
    type: "fill",
    source: BOUNDARY_ID,
    "source-layer": "country_boundaries",
    paint: { "fill-opacity": 0 },
  });

  const refresh = () => {
    const center = map.getCenter();
    const occupied = new Map<
      string,
      { name: string; peer: PeerDot; count: number }
    >();
    for (const peer of getPeers()) {
      if (arcDegrees(center, peer) > VISIBLE_ARC_DEG) continue;
      const point = map.project([peer.lng, peer.lat]);
      const country = map
        .queryRenderedFeatures(point, { layers: [BOUNDARY_ID] })
        .find((f) => inUsWorldview(f.properties?.worldview));
      const code = country?.properties?.iso_3166_1;
      const name = country?.properties?.name_en ?? country?.properties?.name;
      if (typeof code !== "string" || typeof name !== "string") continue;
      const entry = occupied.get(code);
      if (entry) entry.count++;
      else occupied.set(code, { name, peer, count: 1 });
    }

    for (const [code, marker] of labels) {
      if (!occupied.has(code)) {
        marker.remove();
        labels.delete(code);
      }
    }
    for (const [code, { name, peer }] of occupied) {
      const existing = labels.get(code);
      if (existing) {
        existing.setLngLat([peer.lng, peer.lat]);
        continue;
      }
      const el = document.createElement("div");
      el.className = "pulse-country-label";
      el.textContent = name;
      labels.set(
        code,
        new MarkerClass({ element: el, anchor: "bottom", offset: [0, -10] })
          .setLngLat([peer.lng, peer.lat])
          .addTo(map),
      );
    }

    hideCollisions(
      [...occupied.entries()]
        .sort(([, a], [, b]) => b.count - a.count)
        .flatMap(([code]) => labels.get(code) ?? []),
    );
  };

  // Boundary tiles load after the layer is added, so look up again once they arrive.
  const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === BOUNDARY_ID && e.isSourceLoaded) refresh();
  };

  refresh();
  map.on("moveend", refresh);
  map.on("sourcedata", onSourceData);

  const detach = () => {
    map.off("moveend", refresh);
    map.off("sourcedata", onSourceData);
    labels.forEach((marker) => marker.remove());
    labels.clear();
    map.removeLayer(BOUNDARY_ID);
    map.removeSource(BOUNDARY_ID);
  };

  return { refresh, detach };
}
