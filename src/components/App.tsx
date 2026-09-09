import { useEffect, useState } from 'react';
import { EMPTY_OUTPUT_STATE, type OutputState } from '../domain/types';
import { AudienceOutput } from './AudienceOutput';
import { OperatorApp } from './OperatorApp';

function modeFromLocation() {
  return new URLSearchParams(window.location.search).get('mode') === 'audience' ? 'audience' : 'operator';
}

function AudienceApp() {
  const [output, setOutput] = useState<OutputState>({ ...EMPTY_OUTPUT_STATE });

  useEffect(() => {
    return window.kidsPresenter?.onOutputState(setOutput);
  }, []);

  return (
    <div className="audienceApp">
      <AudienceOutput output={output} />
    </div>
  );
}

export function App() {
  return modeFromLocation() === 'audience' ? <AudienceApp /> : <OperatorApp />;
}
