import { Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../storage/database';

export function AttachmentPreview({ id, enabled, alt }: { id: string; enabled?: boolean; alt: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!enabled) return;
    let currentUrl: string | undefined;
    getAttachmentUrl(id).then((value) => { currentUrl = value; setUrl(value); });
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [enabled, id]);
  return url ? <img className="attachment-preview" src={url} alt={alt} /> : <span className="attachment-fallback"><ImageIcon aria-hidden="true" /></span>;
}
