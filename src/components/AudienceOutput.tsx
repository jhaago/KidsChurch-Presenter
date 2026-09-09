import type { OutputState } from '../domain/types';

interface AudienceOutputProps {
  output: OutputState;
  preview?: boolean;
}

function MediaLayer({ output, preview }: { output: OutputState; preview: boolean }) {
  const media = output.media;
  if (!media) return null;

  if (media.fileUrl && media.kind === 'still') {
    return <img className="audienceMediaElement" src={media.fileUrl} alt="" />;
  }

  if (media.fileUrl && (media.kind === 'motion' || media.kind === 'video')) {
    return (
      <video
        className="audienceMediaElement"
        src={media.fileUrl}
        autoPlay
        loop={media.loop ?? media.kind === 'motion'}
        muted={preview ? true : (media.muted ?? media.kind !== 'video')}
        playsInline
        preload={preview ? 'metadata' : 'auto'}
      />
    );
  }

  return <div className="audienceMediaFallback" />;
}

export function AudienceOutput({ output, preview = false }: AudienceOutputProps) {
  const classes = [preview ? 'preview' : 'audienceCanvas', output.media ? 'hasMedia' : '']
    .filter(Boolean)
    .join(' ');

  if (output.logo) {
    return (
      <div className={classes}>
        <div className="logo">
          <b>KP</b>
          <small>KIDS PRESENTER</small>
        </div>
      </div>
    );
  }

  const hasAnyOutput = Boolean(output.slide || output.media || output.prop || output.message);

  return (
    <div className={classes}>
      <MediaLayer output={output} preview={preview} />
      {output.slide ? (
        <div className={preview ? 'previewText' : 'audienceText'}>
          {output.slide.text.split('\n').map((line, index) => (
            <span key={`${output.slide?.slideId}-${index}`}>{line}</span>
          ))}
        </div>
      ) : preview && !hasAnyOutput ? (
        <div className="noOut">No Slide Output</div>
      ) : null}
      {output.message ? <div className="audienceMessage">{output.message.text}</div> : null}
      {output.black ? <div className="audienceBlackout" aria-label="Audience output is black" /> : null}
    </div>
  );
}
