"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";
import { attachGateLabels, setLabelVisibility, type GateLabels } from "@/lib/gate-labels";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

const ARRIVAL_ZOOM = 4;
const ARRIVAL_MS = 3000;
// Degrees of longitude the idle globe turns per second behind the entry gate.
const SPIN_DEG_PER_SEC = 4;

// At zoom 1.4 the globe spans about 60% of an 800 px viewport, leaving room
// for the gate's text above and below it. Each zoom level doubles its size.
function globeZoom(container: HTMLElement): number {
  const side = Math.min(container.clientWidth, container.clientHeight);
  return 1.4 + Math.log2(side / 800);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ZoomBand = "far" | "mid" | "near" | "close";

function zoomBand(zoom: number): ZoomBand {
  if (zoom < 3) return "far";
  if (zoom < 6) return "mid";
  if (zoom < 10) return "near";
  return "close";
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function themeColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
}

export default function WorldMap({
  peers,
  me,
  onPeerClick,
  canConnect,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [band, setBand] = useState<ZoomBand>("far");
  const arrivedRef = useRef(false);
  const gateLabelsRef = useRef<GateLabels | null>(null);

  // Marker click handlers are bound once, so read the live click handler +
  // connectability through refs (synced in an effect, never during render).
  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  const peersRef = useRef(peers);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
    peersRef.current = peers;
  });

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        // Open on the whole globe behind the entry gate. Once the user's
        // location arrives, the arrival effect flies down to them.
        center: [0, 20],
        zoom: globeZoom(containerRef.current),
        projection: "globe",
        attributionControl: true,
      });
      map.on("style.load", () => {
        map.setFog({
          color: themeColor("surface"),
          "high-color": themeColor("raised"),
          "space-color": themeColor("background"),
          "horizon-blend": 0.04,
          "star-intensity": 0.15,
        });
      });
      // Dot size is driven by CSS from the band, so this only re-renders when
      // the zoom crosses a band boundary.
      map.on("zoom", () => setBand(zoomBand(map.getZoom())));
      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Turn the globe slowly until the user enters.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || me || prefersReducedMotion()) return;

    // Chain one-second linear eases, so the spin never stalls between steps.
    const spin = () => {
      const center = map.getCenter();
      center.lng -= SPIN_DEG_PER_SEC;
      map.easeTo({ center, duration: 1000, easing: (t) => t });
    };
    map.on("moveend", spin);
    spin();

    return () => {
      map.off("moveend", spin);
      map.stop();
    };
  }, [ready, me]);

  // Behind the entry gate, label only the countries that hold a dot. Bring
  // every label back once the flight to the user ends (or is interrupted).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!me) {
      let labels: GateLabels | null = null;
      let cancelled = false;
      (async () => {
        const { Marker } = (await import("mapbox-gl")).default;
        if (cancelled) return;
        labels = attachGateLabels(map, () => peersRef.current, Marker);
        gateLabelsRef.current = labels;
      })();
      return () => {
        cancelled = true;
        gateLabelsRef.current = null;
        labels?.detach();
      };
    }
    const showLabels = () => setLabelVisibility(map, "visible");
    map.once("moveend", showLabels);
    return () => {
      map.off("moveend", showLabels);
    };
  }, [ready, me]);

  useEffect(() => {
    gateLabelsRef.current?.refresh();
  }, [peers]);

  // Fly from the globe down to the user once, when their location arrives.
  // Without `essential`, Mapbox jumps instead under reduced motion.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me || arrivedRef.current) return;
    arrivedRef.current = true;
    map.flyTo({
      center: [me.lng, me.lat],
      zoom: ARRIVAL_ZOOM,
      duration: ARRIVAL_MS,
      easing: easeOutCubic,
    });
  }, [ready, me]);

  // Show / move the user's own "you are here" pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `<span class="pulse-me-label">You</span>`;
        meMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  // Reconcile markers whenever the peer list changes (or the map becomes ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.innerHTML = `<span class="pulse-dot-core"></span>`;
          el.title = "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current) onPeerClickRef.current(peer.id);
          });
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        }
        marker.getElement().classList.toggle("pulse-dot-busy", peer.busy);
      }

      // Drop markers for peers that went offline / got filtered out.
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  return (
    <div className="pulse-map absolute inset-0" data-zoom={band}>
      <div ref={containerRef} className="h-full w-full bg-surface" />

      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-raised p-4 text-sm text-foreground">
            Set{" "}
            <code className="text-accent">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code>.env</code> to load the map.
          </p>
        </div>
      )}

      {me && (
        <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          {peers.length} online
        </div>
      )}
    </div>
  );
}
