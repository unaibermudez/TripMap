import { withBase } from '@/lib/assets';
import { formatDateRange } from '@/lib/dates';
import type { Photo } from '@/lib/schema';

interface PhotoGalleryProps {
  photos: readonly Photo[];
  /** Para el texto alternativo de las fotos que no traen pie. */
  stopName: string;
}

export function PhotoGallery({ photos, stopName }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {photos.map((photo) => (
        <figure key={photo.src}>
          {/* `width` y `height` reservan el hueco antes de que cargue (§4). */}
          <img
            src={withBase(photo.src)}
            alt={photo.caption ?? `Foto de ${stopName}`}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded bg-neutral-100"
          />
          {(photo.caption !== undefined || photo.date !== undefined) && (
            <figcaption className="mt-1.5 text-xs leading-snug text-neutral-500">
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
