import { Box } from '@mui/material';
import { PropsWithChildren } from 'react';
import { GREEN_BACKGROUND, RED_BACKGROUND } from '../../theme';

type Props = {
  variant: 'success' | 'error';
};

function Label({ variant, children }: PropsWithChildren<Props>) {
  return variant === 'success' ? (
    <Box
      sx={{
        color: 'success.main',
        background: GREEN_BACKGROUND,
        display: 'inline-block',
        padding: '1px 5px',
        fontWeight: '700',
        borderRadius: '3px',
        fontSize: '14px',
      }}
    >
      {children}
    </Box>
  ) : (
    <Box
      sx={{
        color: 'error.main',
        background: RED_BACKGROUND,
        display: 'inline-block',
        padding: '1px 5px',
        fontWeight: '700',
        borderRadius: '3px',
        fontSize: '14px',
      }}
    >
      {children}
    </Box>
  );
}

export default Label;
