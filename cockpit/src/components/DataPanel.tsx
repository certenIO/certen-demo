import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { CERTEN_COLORS, MONO_FAMILY } from '../theme';
import type { DataPanel as DataPanelData } from '../types';

export function DataPanel({ data }: { data: DataPanelData }) {
  const color = data.safe ? CERTEN_COLORS.success.main : CERTEN_COLORS.error.main;
  return (
    <Card sx={{ p: 2.5, border: `1.5px solid ${alpha(color, 0.4)}` }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <StorageRoundedIcon sx={{ color }} />
        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{data.label}</Typography>
        <Chip
          icon={<LockRoundedIcon />}
          size="small"
          label={data.safe ? 'PROTECTED' : 'AT RISK'}
          color={data.safe ? 'success' : 'error'}
        />
      </Stack>
      <motion.div key={data.value} initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
        <Typography sx={{ fontFamily: MONO_FAMILY, fontWeight: 800, fontSize: '2.4rem', color, lineHeight: 1 }}>
          {data.value.toLocaleString('en-US')}
        </Typography>
      </motion.div>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {data.unit ?? 'records'} {data.note ? `· ${data.note}` : ''}
      </Typography>
      {data.safe && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(CERTEN_COLORS.success.main, 0.08) }}>
          <Typography variant="body2" sx={{ color: CERTEN_COLORS.success.light, fontWeight: 600 }}>
            Untouched. The delete never reached the database.
          </Typography>
        </Box>
      )}
    </Card>
  );
}
