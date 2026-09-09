import { useEffect, useState } from 'react';
import {
  EMPTY_OUTPUT_STATE,
  EMPTY_STAGE_OUTPUT_STATE,
  type OutputState,
  type ScreenKind,
  type StageOutputState,
} from '../domain/types';
import { AudienceOutput } from './AudienceOutput';
import { OperatorApp } from './OperatorApp';
import { StageOutput } from './StageOutput';

function modeFromLocation(): 'operator' | ScreenKind {
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'audience' || mode === 'stage') return mode;
  return 'operator';
}

function AudienceApp() {
  const [output, setOutput] = useState<OutputState>({ ...EMPTY_OUTPUT_STATE });

  useEffect(() => window.kidsPresenter?.onScreenState('audience', setOutput), []);

  return (
    <div className="audienceApp">
      <AudienceOutput output={output} />
    </div>
  );
}

function StageApp() {
  const [output, setOutput] = useState<StageOutputState>({ ...EMPTY_STAGE_OUTPUT_STATE });

  useEffect(() => window.kidsPresenter?.onScreenState('stage', setOutput), []);

  return (
    <div className="stageApp">
      <StageOutput output={output} />
    </div>
  );
}

export function App() {
  const mode = modeFromLocation();
  if (mode === 'audience') return <AudienceApp />;
  if (mode === 'stage') return <StageApp />;
  return <OperatorApp />;
}
