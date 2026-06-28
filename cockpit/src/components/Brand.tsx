import { Box, Typography } from '@mui/material';
import { CERTEN_COLORS, SHADOW } from '../theme';
import { BRAND } from '../brand';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 48 : size === 'sm' ? 28 : 36;
  const fs = size === 'lg' ? '2rem' : size === 'sm' ? '1.05rem' : '1.35rem';
  const MarkIcon = BRAND.markIcon;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: dims,
          height: dims,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: CERTEN_COLORS.primary.main,
          boxShadow: SHADOW.sm,
        }}
      >
        <MarkIcon sx={{ color: CERTEN_COLORS.primary.contrastText, fontSize: dims * 0.6 }} />
      </Box>
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: fs, letterSpacing: '-0.02em' }}>
          {BRAND.name}
        </Typography>
        {size !== 'sm' && (
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: '0.22em', fontSize: '0.62rem' }}
          >
            {BRAND.productLabel}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
