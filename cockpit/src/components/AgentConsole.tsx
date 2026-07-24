import { useEffect, useRef } from 'react';
import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL, SURFACE } from '../theme';
import type { AgentConsole as AgentConsoleData, AgentLine } from '../types';

// `thought` lines are most of the transcript, so they cannot be the faintest thing on screen —
// NEUTRAL[500] on white is unreadable once a screen recording has been compressed.
const STYLE: Record<AgentLine['kind'], { color: string; prefix: string }> = {
  thought: { color: NEUTRAL[700], prefix: '·' },
  action: { color: CERTEN_COLORS.primary.main, prefix: '→' },
  result: { color: CERTEN_COLORS.success.main, prefix: '✓' },
  blocked: { color: CERTEN_COLORS.error.main, prefix: '⛔' },
};

export function AgentConsole({ agent, film = false }: { agent: AgentConsoleData; film?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent.lines.length, agent.streaming]);

  return (
    <Card sx={{ p: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${SURFACE.border}`, bgcolor: alpha(CERTEN_COLORS.secondary.main, 0.08) }}
      >
        <SmartToyRoundedIcon sx={{ color: CERTEN_COLORS.secondary.main }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: film ? '1.05rem' : undefined }}>AI Agent</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: film ? '0.85rem' : '0.75rem' }}>
            {agent.goal}
          </Typography>
        </Box>
        <Chip size="small" label={agent.model} sx={{ fontFamily: MONO_FAMILY, bgcolor: alpha(CERTEN_COLORS.secondary.main, 0.10), color: CERTEN_COLORS.secondary.dark }} />
      </Stack>

      <Box sx={{ p: film ? 2.25 : 2, flexGrow: 1, overflowY: 'auto', fontFamily: MONO_FAMILY, fontSize: film ? '1.02rem' : '0.82rem', minHeight: 220 }}>
        {agent.lines.length === 0 && (
          <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>Agent idle…</Typography>
        )}
        {agent.lines.map((line, i) => {
          const s = STYLE[line.kind];
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              <Typography component="div" sx={{ color: s.color, mb: film ? 1.4 : 1, lineHeight: 1.55, fontWeight: film ? 500 : 400, fontFamily: MONO_FAMILY, fontSize: film ? '1.02rem' : '0.82rem' }}>
                <Box component="span" sx={{ opacity: 0.85, mr: 1 }}>
                  {s.prefix}
                </Box>
                {line.text}
              </Typography>
            </motion.div>
          );
        })}
        {agent.streaming && (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 9,
              height: 16,
              bgcolor: CERTEN_COLORS.secondary.main,
              animation: 'blink 1s steps(2) infinite',
              '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
            }}
          />
        )}
        <div ref={endRef} />
      </Box>
    </Card>
  );
}
