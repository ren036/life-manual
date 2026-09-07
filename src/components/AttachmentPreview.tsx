import { Center, Image } from '@mantine/core';
import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../storage/database';

export function AttachmentPreview({
  id,
  enabled,
  alt,
}: {
  id: string;
  enabled?: boolean;
  alt: string;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    setUrl(undefined);
    if (!enabled) return;
    let disposed = false;
    let currentUrl: string | undefined;
    getAttachmentUrl(id)
      .then((value) => {
        if (disposed) {
          if (value) URL.revokeObjectURL(value);
          return;
        }
        currentUrl = value;
        setUrl(value);
      })
      .catch(() => {
        if (!disposed) setUrl(undefined);
      });
    return () => {
      disposed = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [enabled, id]);
  return url ? (
    <Image src={url} alt={alt} w="100%" h="100%" fit="cover" />
  ) : (
    <Center w="100%" h="100%" c="green">
      <ImageIcon aria-hidden="true" />
    </Center>
  );
}
