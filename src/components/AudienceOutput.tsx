import type { CSSProperties } from 'react';
import type { OutputState, SlideBoxLayout, SlideTextFormat } from '../domain/types';

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

function liveTextStyle(
  format: SlideTextFormat | undefined,
  layout: SlideBoxLayout | undefined,
  preview: boolean,
): CSSProperties | undefined {
  if (!format) return undefined;

  const alignItems =
    format.textAlign === 'left' ? 'flex-start' :
    format.textAlign === 'right' ? 'flex-end' :
    'center';
  const justifyContent =
    format.verticalAlign === 'top' ? 'flex-start' :
    format.verticalAlign === 'bottom' ? 'flex-end' :
    'center';

  return {
    inset: layout ? 'auto' : `${format.marginPercent}%`,
    left: layout ? `${layout.xPercent}%` : undefined,
    top: layout ? `${layout.yPercent}%` : undefined,
    width: layout ? `${layout.widthPercent}%` : undefined,
    height: layout ? `${layout.heightPercent}%` : undefined,
    alignItems,
    justifyContent,
    color: format.textColor,
    fontFamily: format.fontFamily,
    fontSize: preview
      ? `clamp(7px, ${Math.max(0.5, format.fontSizeVw * 0.17)}vw, 16px)`
      : `clamp(24px, ${format.fontSizeVw}vw, 150px)`,
    fontWeight: format.fontWeight,
    lineHeight: format.lineHeight,
    textAlign: format.textAlign,
    textShadow: format.shadow ? '0 3px 14px rgba(0,0,0,.8)' : 'none',
    textTransform: format.uppercase ? 'uppercase' : 'none',
  };
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
        <div
          className={preview ? 'previewText' : 'audienceText'}
          style={liveTextStyle(output.slide.format, output.slide.layout, preview)}
        >
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
