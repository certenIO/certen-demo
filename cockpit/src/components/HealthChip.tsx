import { useEffect, useState } from 'react';
import { Box, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { CERTEN_COLORS } from '../theme';
import { fetchDemoHealth, type DemoHealthDep } from '../api';

/**
 * Live/simulated credibility chip (Runbook 12). Replaces a bare "SIMULATED" with
 * "SIMULATED CHOREOGRAPHY" + a tooltip, and shows real dependency health in live mode.
 */
export function HealthChip({ mode }: { mode: string }) {
  const live = mode === 'live';
  const [deps, setDeps] = useState<DemoHealthDep[]>([]);

  useEffect(() => {
    if (!live) return;
    let stop = false;
    const load = () => fetchDemoHealth().then((d) => !stop && setDeps(d.deps)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [live]);

  if (!live) {
    return (
      <Tooltip title="Uses deterministic demo data; proof and explorer links mirror live shapes. Switch to live mode for real gateway / proof / EVM execution.">
        <Chip size="small" label="SIMULATED CHOREOGRAPHY" color="warning" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.66rem' }} />
      </Tooltip>
    );
  }

  const anyDown = deps.some((d) => d.status === 'down');
  const color = deps.length === 0 ? CERTEN_COLORS.info.main : anyDown ? CERTEN_COLORS.error.main : CERTEN_COLORS.success.main;
  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.72rem' }}>Live dependencies</Typography>
          {deps.length === 0 && <Typography sx={{ fontSize: '0.7rem' }}>checking…</Typography>}
          {deps.map((d) => (
            <Stack key={d.name} direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.status === 'ok' ? CERTEN_COLORS.success.main : d.status === 'down' ? CERTEN_COLORS.error.main : CERTEN_COLORS.warning.main }} />
              <Typography sx={{ fontSize: '0.7rem' }}>{d.name}: {d.detail}</Typography>
            </Stack>
          ))}
        </Box>
      }
    >
      <Chip
        size="small"
        label={anyDown ? 'LIVE · degraded' : 'LIVE · API Gateway'}
        sx={{ fontWeight: 700, fontSize: '0.66rem', bgcolor: alpha(color, 0.15), color, border: `1px solid ${alpha(color, 0.4)}` }}
      />
    </Tooltip>
  );
}
