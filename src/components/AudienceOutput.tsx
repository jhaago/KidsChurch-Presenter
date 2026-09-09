import type { OutputState } from '../domain/types';

interface AudienceOutputProps {
  output: OutputState;
  preview?: boolean;
}

export function AudienceOutput({ output, preview = false }: AudienceOutputProps) {
  const classes = [preview ? 'preview' : 'audienceCanvas', output.black ? 'black' : '']
    .filter(Boolean)
    .join(' ');

  if (output.black) {
    return <div className={classes} aria-label="Audience output is black" />;
  }

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
    <div className={`${classes} ${output.media ? 'hasMedia' : ''}`}>
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
    </div>
  );
}
