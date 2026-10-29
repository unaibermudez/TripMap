import type { FeatureCollection, LineString, Point, Position } from 'geojson';
import {
  MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
// MapLibre busca su worker con `new URL('./maplibre-gl-worker.mjs',
// import.meta.url)`. Una vez empaquetado, esa URL apunta al directorio del
// bundle, donde el fichero no está: sin worker no se procesa ningún tile y el
// mapa sale en blanco. `?worker&url` hace que Vite lo empaquete aparte y nos
// dé su URL, en desarrollo y en producción.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BasemapSwitcher } from '@/components/BasemapSwitcher';
import { MapControls } from '@/components/MapControls';
import { basemapById } from '@/lib/basemap';
import { lineCollection, stopIndexOf, stopsCollection, type StopProperties } from '@/lib/mapData';
import { legGeometries, partialRouteLine, routeLine, tripBounds } from '@/lib/route';
import { tripStore, useTripStore } from '@/lib/tripStore';

const FLY_DURATION_MS = 1500;

/** Zoom al volver a la parada activa desde el plano general. */
const FOCUS_ZOOM = 9;
const OVERVIEW_PADDING = 48;

const SOURCE_ROUTE = 'trip-route';
const SOURCE_TRAVELLED = 'trip-route-travelled';
const SOURCE_STOPS = 'trip-stops';
const LAYER_STOPS = 'trip-stops-circle';
const LAYER_STOPS_ACTIVE = 'trip-stops-active';

/** Las dos capas de paradas responden al ratón: la activa tapa a la de debajo. */
const STOP_LAYERS = [LAYER_STOPS, LAYER_STOPS_ACTIVE];

/** `maplibre-gl` no reexporta el tipo del style-spec, así que se saca de la firma. */
type Filter = NonNullable<Parameters<MapLibreMap['setFilter']>[1]>;

const activeStopFilter = (index: number): Filter => ['==', ['get', 'index'], index];

interface TripLayers {
  geometries: Position[][];
  route: FeatureCollection<LineString>;
  stops: FeatureCollection<Point, StopProperties>;
}

/**
 * Pone la ruta y las paradas sobre el style que haya cargado. Se llama en cada
 * `style.load`, también después de cambiar de basemap: el style nuevo llega sin
 * nada de esto (§3.8). El estado que necesita lo lee del store en el momento,
 * que es el único que puede haber cambiado mientras el style se descargaba.
 */
function addTripLayers(map: MapLibreMap, { geometries, route, stops }: TripLayers): void {
  const { currentStopIndex, basemapId } = tripStore.getState();
  const basemap = basemapById(basemapId);

  map.addSource(SOURCE_ROUTE, { type: 'geojson', data: route });
  map.addSource(SOURCE_TRAVELLED, {
    type: 'geojson',
    data: lineCollection(partialRouteLine(geometries, currentStopIndex)),
  });
  map.addSource(SOURCE_STOPS, { type: 'geojson', data: stops });

  map.addLayer({
    id: 'trip-route-full',
    type: 'line',
    source: SOURCE_ROUTE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': basemap.routeColor, 'line-width': 2 },
  });
  map.addLayer({
    id: 'trip-route-travelled-line',
    type: 'line',
    source: SOURCE_TRAVELLED,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': basemap.travelledColor, 'line-width': 3 },
  });
  map.addLayer({
    id: LAYER_STOPS,
    type: 'circle',
    source: SOURCE_STOPS,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 9, 6],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff',
    },
  });
  map.addLayer({
    id: LAYER_STOPS_ACTIVE,
    type: 'circle',
    source: SOURCE_STOPS,
    filter: activeStopFilter(currentStopIndex),
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 7, 9, 10],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  });
}

setWorkerUrl(workerUrl);

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // El primer encuadre salta en vez de volar: no hay nada de donde venir.
  const pendingFirstFrame = useRef(true);
  const [isStyleReady, setStyleReady] = useState(false);

  const trip = useTripStore((state) => state.trip);
  const currentStopIndex = useTripStore((state) => state.currentStopIndex);
  const basemapId = useTripStore((state) => state.basemapId);
  // El style que tiene puesto el mapa. El constructor ya pone el primero, así
  // que la comparación evita un `setStyle` de más al montar.
  const appliedBasemapId = useRef(basemapId);

  const geometries = useMemo(() => legGeometries(trip), [trip]);
  const stops = useMemo(() => stopsCollection(trip), [trip]);
  const route = useMemo(() => lineCollection(routeLine(geometries)), [geometries]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const first = trip.stops[0];
    const map = new MapLibreMap({
      container,
      style: basemapById(tripStore.getState().basemapId).style,
      center: first?.coords ?? [0, 0],
      zoom: 4.5,
      attributionControl: { compact: false },
      // Las flechas navegan por paradas (§3). El canvas las atiende antes que
      // nadie en cuanto tiene el foco, así que aquí se desactivan.
      keyboard: false,
    });
    mapRef.current = map;
    pendingFirstFrame.current = true;

    const onStopClick = (event: MapLayerMouseEvent) => {
      const index = stopIndexOf(event.features?.[0]?.properties);
      if (index !== null) tripStore.getState().goToStop(index);
    };
    const onStopEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onStopLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // Los listeners por capa se registran una sola vez, aunque sus capas todavía
    // no existan: van por id, así que sobreviven al cambio de style.
    map.on('click', STOP_LAYERS, onStopClick);
    map.on('mouseenter', STOP_LAYERS, onStopEnter);
    map.on('mouseleave', STOP_LAYERS, onStopLeave);

    // `style.load` salta con el primer style y con cada uno que venga después.
    map.on('style.load', () => {
      addTripLayers(map, { geometries, route, stops });
      setStyleReady(true);
    });

    return () => {
      mapRef.current = null;
      setStyleReady(false);
      // `remove` se lleva por delante los listeners y el contexto WebGL.
      map.remove();
    };
  }, [trip, geometries, stops, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || basemapId === appliedBasemapId.current) return;
    appliedBasemapId.current = basemapId;

    // Sin `diff: false` MapLibre parchea el style anterior en vez de cargar el
    // nuevo entero: no dispara `style.load` y las capas del viaje se quedan
    // colgando de sources que ya no están.
    setStyleReady(false);
    map.setStyle(basemapById(basemapId).style, { diff: false });
  }, [basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !isStyleReady) return;

    map.setFilter(LAYER_STOPS_ACTIVE, activeStopFilter(currentStopIndex));

    const travelled = map.getSource<GeoJSONSource>(SOURCE_TRAVELLED);
    if (travelled !== undefined) {
      void travelled.setData(lineCollection(partialRouteLine(geometries, currentStopIndex)));
    }

    const stop = trip.stops[currentStopIndex];
    if (stop === undefined) return;

    // Mientras se arrastra el cursor de la timeline el vuelo no daría tiempo a
    // terminar antes del siguiente cambio (§3.3).
    if (pendingFirstFrame.current || tripStore.getState().isScrubbing) {
      pendingFirstFrame.current = false;
      map.jumpTo({ center: stop.coords });
      return;
    }

    map.flyTo({ center: stop.coords, duration: FLY_DURATION_MS });
  }, [isStyleReady, currentStopIndex, geometries, trip]);

  const focusCurrentStop = () => {
    const map = mapRef.current;
    const stop = trip.stops[currentStopIndex];
    if (map === null || stop === undefined) return;
    map.flyTo({ center: stop.coords, zoom: FOCUS_ZOOM, duration: FLY_DURATION_MS });
  };

  const showOverview = () => {
    const [west, south, east, north] = tripBounds(trip, geometries);
    mapRef.current?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: OVERVIEW_PADDING, duration: FLY_DURATION_MS },
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <MapControls onFocusStop={focusCurrentStop} onShowOverview={showOverview} />
      <BasemapSwitcher />
    </div>
  );
}
