import { useEffect, useState } from 'react';
import { AudioLines, NotebookPen } from 'lucide-react';
import { getAttachmentUrl } from '../storage/database';
import type { NoteEntry } from '../types';
export function NoteDetailPage({ note }: { note: NoteEntry }) {
  const lines = note.content.split('\n');
  const body =
    lines[0].trim() === note.title.trim() ? lines.slice(1).join('\n').trim() : note.content;
  const [audioUrl, setAudioUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let url = '';
    setAudioUrl('');
    setFailed(false);
    if (note.audio)
      void getAttachmentUrl(note.audio.id)
        .then((value) => {
          url = value || '';
          if (active) {
            setAudioUrl(url);
            setFailed(!url);
          } else if (url) URL.revokeObjectURL(url);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [note.audio?.id]);
  return (
    <article className="note-detail">
      <div className="detail-kicker">
        <NotebookPen size={15} />
        随记
        <span className="tiny-dot" />
        {note.mood}
      </div>
      <h1>{note.title}</h1>
      <p className="detail-date">
        {new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(note.createdAt)}
      </p>
      {body && <div className="note-body">{body}</div>}
      {note.audio && (
        <section className="detail-section">
          <h2>
            <AudioLines size={18} />
            语音记录
          </h2>
          {audioUrl ? (
            <audio controls src={audioUrl} preload="metadata" style={{ width: '100%' }} />
          ) : (
            <p>{failed ? '录音暂时无法读取' : '正在加载录音…'}</p>
          )}
        </section>
      )}
    </article>
  );
}
