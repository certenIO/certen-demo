import { Box, Typography } from '@mui/material';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { CERTEN_COLORS } from '../theme';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 48 : size === 'sm' ? 28 : 36;
  const fs = size === 'lg' ? '2rem' : size === 'sm' ? '1.05rem' : '1.35rem';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: dims,
          height: dims,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          background: `linear-gradient(135deg, ${CERTEN_COLORS.primary.main}, ${CERTEN_COLORS.primary.dark})`,
          boxShadow: `0 6px 18px ${CERTEN_COLORS.primary.dark}55`,
        }}
      >
        <VerifiedUserRoundedIcon sx={{ color: '#fff', fontSize: dims * 0.6 }} />
      </Box>
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: fs, letterSpacing: '-0.02em' }}>
          CERTEN
        </Typography>
        {size !== 'sm' && (
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: '0.22em', fontSize: '0.62rem' }}
          >
            Authorization Cockpit
          </Typography>
        )}
      </Box>
    </Box>
  );
}
