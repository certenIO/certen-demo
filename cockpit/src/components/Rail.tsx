import { ReactNode } from 'react';
import { Box, Card, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { CERTEN_COLORS } from '../theme';

/**
 * One numbered rail of the engine (①..⑤). `compact` packs it for the no-scroll presentation
 * layout (Runbook 1). When `active` it lights up; when `dim` it renders muted with a placeholder.
 */
export function Rail({
  index,
  title,
  active,
  dim,
  right,
  accent = CERTEN_COLORS.primary.main,
  children,
  placeholder,
  compact = true,
}: {
  index: number;
  title: string;
  active?: boolean;
  dim?: boolean;
  right?: ReactNode;
  accent?: string;
  children?: ReactNode;
  placeholder?: string;
  compact?: boolean;
}) {
  const pad = compact ? 1.1 : 2.25;
  const badge = compact ? 22 : 30;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dim ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        sx={{
          p: pad,
          borderRadius: 2,
          borderColor: active ? alpha(accent, 0.45) : undefined,
          boxShadow: active ? `0 0 0 1px ${alpha(accent, 0.35)}, 0 8px 22px ${alpha(accent, 0.1)}` : undefined,
          background: active ? `linear-gradient(135deg, ${alpha(accent, 0.07)}, transparent 60%)` : undefined,
          transition: 'all 220ms cubic-bezier(0.2,0,0.38,0.9)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: children ? (compact ? 0.5 : 1.5) : 0 }}>
          <Box
            sx={{
              width: badge, height: badge, borderRadius: '50%', display: 'grid', placeItems: 'center',
              flexShrink: 0, fontWeight: 800, fontSize: compact ? '0.82rem' : '0.9rem',
              color: active ? '#fff' : 'text.secondary',
              bgcolor: active ? accent : alpha('#ffffff', 0.06),
              boxShadow: active ? `0 3px 10px ${alpha(accent, 0.5)}` : 'none',
            }}
          >
            {index}
          </Box>
          <Typography variant="overline" sx={{ color: active ? accent : 'text.secondary', flexGrow: 1, fontSize: compact ? '0.66rem' : undefined, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {right}
        </Stack>
        {children ?? (
          placeholder && (
            <Typography variant="body2" sx={{ color: 'text.secondary', pl: compact ? 4.75 : 5.5, fontStyle: 'italic', fontSize: '0.78rem' }}>
              {placeholder}
            </Typography>
          )
        )}
      </Card>
    </motion.div>
  );
}
