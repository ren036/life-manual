export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FULL_IMAGE: CropArea = { x: 0, y: 0, width: 1, height: 1 };

// Coordinates are fractions of the displayed image, independent of screen size.
export async function cropImage(
  image: HTMLImageElement,
  file: File,
  area: CropArea,
): Promise<File> {
  const x = Math.min(image.naturalWidth - 1, Math.max(0, Math.round(area.x * image.naturalWidth)));
  const y = Math.min(
    image.naturalHeight - 1,
    Math.max(0, Math.round(area.y * image.naturalHeight)),
  );
  const width = Math.min(
    image.naturalWidth - x,
    Math.max(1, Math.round(area.width * image.naturalWidth)),
  );
  const height = Math.min(
    image.naturalHeight - y,
    Math.max(1, Math.round(area.height * image.naturalHeight)),
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建裁剪画布');
  context.drawImage(image, x, y, width, height, 0, 0, width, height);
  const type = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) throw new Error('无法生成裁剪图片');
  const extension =
    blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
  const name = `${file.name.replace(/\.[^.]+$/, '')}-裁剪.${extension}`;
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}
