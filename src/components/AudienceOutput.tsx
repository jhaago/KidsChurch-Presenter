import type { CSSProperties } from 'react';
import { getMediaPlaybackSettings } from '../domain/mediaPlayback';
import type { LiveSlideElement, OutputState, SlideBoxLayout, SlideTextFormat } from '../domain/types';

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
    const playback = getMediaPlaybackSettings(media.id);
    const trimStartSeconds = Math.max(0, (playback.trimStartMs ?? 0) / 1000);
    const trimEndSeconds = playback.trimEndMs ? playback.trimEndMs / 1000 : undefined;
    const shouldLoop = playback.loop ?? media.loop ?? media.kind === 'motion';
    const needsManualLoop = shouldLoop && (trimStartSeconds > 0 || trimEndSeconds !== undefined);
    const playbackKey = [
      media.id,
      trimStartSeconds.toFixed(3),
      trimEndSeconds?.toFixed(3) ?? 'end',
      shouldLoop ? 'loop' : 'once',
    ].join(':');

    return (
      <video
        key={playbackKey}
        className="audienceMediaElement"
        src={media.fileUrl}
        autoPlay
        loop={shouldLoop && !needsManualLoop}
        muted={preview ? true : (media.muted ?? media.kind !== 'video')}
        playsInline
        preload={preview ? 'metadata' : 'auto'}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (trimStartSeconds > 0 && Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.min(trimStartSeconds, Math.max(0, video.duration - 0.05));
          }
          void video.play().catch(() => undefined);
        }}
        onTimeUpdate={(event) => {
          if (trimEndSeconds === undefined) return;
          const video = event.currentTarget;
          const actualEnd = Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(trimEndSeconds, video.duration)
            : trimEndSeconds;
          if (video.currentTime < actualEnd - 0.025) return;

          if (shouldLoop) {
            video.currentTime = Math.min(trimStartSeconds, Math.max(0, actualEnd - 0.05));
            void video.play().catch(() => undefined);
          } else {
            video.pause();
            video.currentTime = actualEnd;
          }
        }}
        onEnded={(event) => {
          if (!needsManualLoop) return;
          const video = event.currentTarget;
          video.currentTime = trimStartSeconds;
          void video.play().catch(() => undefined);
        }}
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

function SlideElementLayer({
  element,
  index,
  preview,
}: {
  element: LiveSlideElement;
  index: number;
  preview: boolean;
}) {
  const zIndex = 2 + index;

  if (element.type === 'image') {
    if (!element.fileUrl) return null;
    return (
      <img
        className="audienceSlideImageElement"
        src={element.fileUrl}
        alt=""
        style={{
          left: `${element.layout.xPercent}%`,
          top: `${element.layout.yPercent}%`,
          width: `${element.layout.widthPercent}%`,
          height: `${element.layout.heightPercent}%`,
          objectFit: element.fit,
          opacity: element.opacity,
          zIndex,
        }}
      />
    );
  }

  if (element.type === 'shape') {
    return (
      <div
        className="audienceSlideShapeElement"
        style={{
          left: `${element.layout.xPercent}%`,
          top: `${element.layout.yPercent}%`,
          width: `${element.layout.widthPercent}%`,
          height: `${element.layout.heightPercent}%`,
          backgroundColor: element.fillColor,
          borderColor: element.borderColor,
          borderStyle: element.borderWidth > 0 ? 'solid' : 'none',
          borderWidth: element.borderWidth,
          borderRadius: element.shape === 'ellipse' ? '50%' : 0,
          opacity: element.opacity,
          zIndex,
        }}
      />
    );
  }

  return (
    <div
      className={preview ? 'previewText audienceSlideTextElement' : 'audienceText audienceSlideTextElement'}
      style={{
        ...liveTextStyle(element.format, element.layout, preview),
        opacity: element.opacity,
        zIndex,
      }}
    >
      {element.text.split('\n').map((line, lineIndex) => (
        <span key={`${element.id}-${lineIndex}`}>{line}</span>
      ))}
    </div>
  );
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
        output.slide.elements?.length ? (
          <>
            {output.slide.elements.map((element, index) => (
              <SlideElementLayer
                element={element}
                index={index}
                key={element.id}
                preview={preview}
              />
            ))}
          </>
        ) : (
          <div
            className={preview ? 'previewText' : 'audienceText'}
            style={liveTextStyle(output.slide.format, output.slide.layout, preview)}
          >
            {output.slide.text.split('\n').map((line, index) => (
              <span key={`${output.slide?.slideId}-${index}`}>{line}</span>
            ))}
          </div>
        )
      ) : preview && !hasAnyOutput ? (
        <div className="noOut">No Slide Output</div>
      ) : null}
      {output.message ? <div className="audienceMessage">{output.message.text}</div> : null}
      {output.black ? <div className="audienceBlackout" aria-label="Audience output is black" /> : null}
    </div>
  );
}
