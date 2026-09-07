const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;
export async function compressImage(file: File): Promise<File> {
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    file.size < 900 * 1024
  )
    return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type =
    file.type === 'image/webp'
      ? 'image/webp'
      : file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, JPEG_QUALITY),
  );
  return !blob || blob.size >= file.size
    ? file
    : new File([blob], file.name, { type, lastModified: file.lastModified });
}
export async function optimizeAttachments(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file).catch(() => file)));
}
