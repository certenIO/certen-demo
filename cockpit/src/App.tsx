import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { ScenarioMeta } from './types';
import { fetchScenarios } from './api';
import { Launcher } from './components/Launcher';
import { CockpitView } from './components/CockpitView';

export function App() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [mode, setMode] = useState<string>('simulated');
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchScenarios()
        .then((d) => {
          if (cancelled) return;
          setScenarios(d.scenarios);
          setMode(d.mode);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError('Cannot reach the orchestrator. Is it running on :8770?');
        });
    load();
    const t = setInterval(() => {
      if (!error) return;
      load();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [error]);

  const activeMeta = scenarios.find((s) => s.id === active) ?? null;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      {activeMeta ? (
        <CockpitView meta={activeMeta} mode={mode} onExit={() => setActive(null)} />
      ) : (
        <Launcher scenarios={scenarios} mode={mode} error={error} onPick={setActive} />
      )}
    </Box>
  );
}
