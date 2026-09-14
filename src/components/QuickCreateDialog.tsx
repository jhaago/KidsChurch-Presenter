import { useMemo, useState } from 'react';
import { genericSlidesFromText, songGroupsFromLyrics } from '../domain/quickCreate';

export interface QuickCreateDraft {
  title: string;
  text: string;
  maxLines: number;
}

interface QuickCreateDialogProps {
  kind: 'song' | 'slides';
  onClose: () => void;
  onCreate: (draft: QuickCreateDraft, addToService: boolean) => void;
}

export function QuickCreateDialog({ kind, onClose, onCreate }: QuickCreateDialogProps) {
  const [title, setTitle] = useState(kind === 'song' ? 'New Song' : 'New Slides');
  const [text, setText] = useState('');
  const [maxLines, setMaxLines] = useState(4);
  const preview = useMemo(() => {
    if (kind === 'song') {
      const groups = songGroupsFromLyrics(text, maxLines);
      return { groups: groups.length, slides: groups.reduce((total, group) => total + group.slides.length, 0) };
    }
    return { groups: 1, slides: genericSlidesFromText(text, maxLines).length };
  }, [kind, maxLines, text]);

  const submit = (addToService: boolean) => {
    onCreate({ title: title.trim() || (kind === 'song' ? 'New Song' : 'New Slides'), text, maxLines }, addToService);
    onClose();
  };

  return (
    <div className="quickCreateOverlay" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="quickCreateDialog" role="dialog" aria-modal="true" aria-label={`Quick create ${kind}`}>
        <header>
          <div>
            <strong>{kind === 'song' ? 'QUICK CREATE SONG' : 'QUICK CREATE SLIDES'}</strong>
            <span>{kind === 'song' ? 'Paste complete lyrics and Presenter will build the sections and slides.' : 'Paste text and Presenter will build slides at blank lines or the selected line limit.'}</span>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <label className="quickCreateTitle">
          <span>{kind === 'song' ? 'SONG TITLE' : 'PRESENTATION TITLE'}</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="quickCreateText">
          <span>{kind === 'song' ? 'LYRICS' : 'SLIDE TEXT'}</span>
          <textarea
            placeholder={kind === 'song'
              ? '[Verse 1]\nFirst lyric line\nSecond lyric line\n\n[Chorus]\nChorus line one\nChorus line two'
              : 'Paste the first slide here.\n\nUse a blank line to begin the next slide.'}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <div className="quickCreateOptions">
          <label>
            <span>MAXIMUM LINES PER SLIDE</span>
            <select value={maxLines} onChange={(event) => setMaxLines(Number(event.target.value))}>
              <option value={2}>2 lines</option>
              <option value={3}>3 lines</option>
              <option value={4}>4 lines</option>
              <option value={6}>6 lines</option>
            </select>
          </label>
          <div>
            <span>PREVIEW</span>
            <strong>{preview.groups} {preview.groups === 1 ? 'section' : 'sections'} · {preview.slides} {preview.slides === 1 ? 'slide' : 'slides'}</strong>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={() => submit(false)}>Save to Library</button>
          <button className="primary" type="button" onClick={() => submit(true)}>Save &amp; Add to Set List</button>
        </footer>
      </section>
    </div>
  );
}
