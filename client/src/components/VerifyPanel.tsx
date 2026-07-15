import { useState } from 'react';
import { api } from '../api';

interface VerifyPanelProps {
  roundId: string | null;
}

export function VerifyPanel({ roundId }: VerifyPanelProps) {
  const [result, setResult] = useState<string>('');

  const verify = async () => {
    if (!roundId) return;
    try {
      setResult(JSON.stringify(await api.verifyRound(roundId), null, 2));
    } catch (err) {
      setResult(`Verification unavailable: ${(err as Error).message}`);
    }
  };

  return (
    <div className="panel">
      <h2>Verify this round</h2>
      <code>{roundId ?? 'no round yet'}</code>
      <button onClick={verify} disabled={!roundId}>
        Verify
      </button>
      {result && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{result}</pre>}
    </div>
  );
}
