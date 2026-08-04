import { mkdir, readdir } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'photos-src';
const OUTPUT_DIR = 'public/photos';

/** Lado más largo tras el redimensionado; el otro se ajusta manteniendo proporción. */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tiff', '.avif', '.webp']);

interface ProcessedPhoto {
  file: string;
  src: string;
  width: number;
  height: number;
}

async function listSourceFiles(): Promise<string[]> {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true }).catch(() => {
    throw new Error(
      `No existe "${SOURCE_DIR}/". Crea la carpeta y pon ahí las fotos originales antes de ejecutar el script.`,
    );
  });

  return entries
    .filter(
      (entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort();
}

/**
 * Redimensiona al máximo definido (sin recortar ni ampliar fotos ya pequeñas),
 * corrige la orientación EXIF y convierte a webp. El nombre de fichero se
 * conserva tal cual lo deja el autor en `photos-src/`, así que ya debe seguir
 * la convención `<id-de-parada>-<descripción>` antes de procesarlo.
 */
async function processPhoto(file: string): Promise<ProcessedPhoto> {
  const outputName = `${parse(file).name}.webp`;
  const inputPath = join(SOURCE_DIR, file);
  const outputPath = join(OUTPUT_DIR, outputName);

  const info = await sharp(inputPath)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  return { file, src: `/photos/${outputName}`, width: info.width, height: info.height };
}

async function main(): Promise<void> {
  const files = await listSourceFiles();
  if (files.length === 0) {
    console.log(`No hay fotos en "${SOURCE_DIR}/".`);
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const results: ProcessedPhoto[] = [];
  for (const file of files) {
    try {
      const result = await processPhoto(file);
      results.push(result);
      console.log(`✓ ${file} → ${result.src} (${result.width}×${result.height})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`"${file}": ${reason}`);
    }
  }

  console.log('\nPega cada línea en el `photos` de la parada correspondiente:\n');
  for (const { src, width, height } of results) {
    console.log(`{ src: '${src}', width: ${width}, height: ${height} },`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
