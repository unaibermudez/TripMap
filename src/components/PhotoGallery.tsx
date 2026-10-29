import { withBase } from '@/lib/assets';
import { formatDateRange } from '@/lib/dates';
import type { Photo } from '@/lib/schema';

interface PhotoGalleryProps {
  photos: readonly Photo[];
  /** Para el texto alternativo de las fotos que no traen pie. */
  stopName: string;
}

/**
 * Las apaisadas ocupan todo el ancho. Las verticales se emparejan solo si son
 * consecutivas: una vertical suelta iría a media fila con el otro medio vacío.
 */
function halfWidthFlags(photos: readonly Photo[]): boolean[] {
  const half = photos.map(() => false);

  for (let i = 0; i < photos.length - 1; i++) {
    const current = photos[i];
    const next = photos[i + 1];
    if (current === undefined || next === undefined) continue;
    if (current.width < current.height && next.width < next.height) {
      half[i] = true;
      half[i + 1] = true;
      i++;
    }
  }

  return half;
}

export function PhotoGallery({ photos, stopName }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  const half = halfWidthFlags(photos);

  return (
    <div className="mt-5 grid grid-cols-2 items-start gap-3">
      {photos.map((photo, index) => (
        <figure key={photo.src} className={half[index] ? undefined : 'col-span-2'}>
          {/* `width` y `height` reservan el hueco antes de que cargue (§4). */}
          <img
            src={withBase(photo.src)}
            alt={photo.caption ?? `Foto de ${stopName}`}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className={`rounded bg-neutral-100 ${
              photo.width >= photo.height
                ? 'h-auto w-full'
                : 'mx-auto h-auto max-h-[28rem] w-auto max-w-full'
            }`}
          />
          {(photo.caption !== undefined || photo.date !== undefined) && (
            <figcaption className="mt-1.5 text-[13px] leading-snug text-neutral-500">
              {photo.caption}
              {photo.date !== undefined && (
                <span className="text-neutral-400">
                  {photo.caption === undefined ? '' : ' · '}
                  {formatDateRange(photo.date)}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
