import type { StageOutputState } from '../domain/types';

interface StageOutputProps {
  output: StageOutputState;
}

function Lines({ text }: { text: string | null }) {
  if (!text) return <span className="stageEmpty">—</span>;
  return (
    <>
      {text.split('\n').map((line, index) => (
        <span key={line + '-' + index}>{line}</span>
      ))}
    </>
  );
}

export function StageOutput({ output }: StageOutputProps) {
  return (
    <div className="stageCanvas">
      <header className="stageHeader">
        <div>
          <small>CURRENT PRESENTATION</small>
          <strong>{output.presentationTitle || 'No live presentation'}</strong>
        </div>
        <div className="stageClock">
          <small>STAGE</small>
          <strong>READY</strong>
        </div>
      </header>

      <main className="stageBody">
        <section className="stageCurrent">
          <div className="stageLabel">CURRENT</div>
          <div className="stageCurrentText">
            <Lines text={output.currentText} />
          </div>
        </section>

        <section className="stageNext">
          <div className="stageLabel">NEXT</div>
          <div className="stageNextText">
            <Lines text={output.nextText} />
          </div>
        </section>
      </main>

      <footer className="stageFooter">
        <span>{output.currentSlideId || 'No current slide'}</span>
        <span>{output.nextSlideId ? 'Next: ' + output.nextSlideId : 'End of presentation'}</span>
      </footer>
    </div>
  );
}
