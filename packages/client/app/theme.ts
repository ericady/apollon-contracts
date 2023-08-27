'use client';

import { createTheme } from '@mui/material/styles';

import '@fontsource/inter';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

// TODO: Move these into the finally
const PRIMARY_BACKGROUND = '#14111D';
const PAPER_BACKGROUND = '#2A2636';
const PRIMARY_TEXT = '#FFFFFF';
export const SECONDARY_TEXT = '#827F8B';
const THRID_TEXT = '#504D59';
const DISABLED_TEXT = '#504D59';
const BUTTON_BACKGROUND = '#1E1B27';
const BUTTON_TEXT = '#827F8B';
export const BUTTON_BORDER = '#282531';
const BUTTON_2_TEXT = '#ffffff';
const BUTTON_2_BORDER = '#3C3945';
const BUTTON_BACKGROUND_HOVER = '#1D202F';
export const GREEN_BACKGROUND = '#1A2E25';
export const RED_BACKGROUND = '#321923';
export const BLUE_BACKGROUND = '#18293e';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: BUTTON_TEXT,
      contrastText: '#FFFFFF',
    },
    background: {
      default: PRIMARY_BACKGROUND,
      paper: PAPER_BACKGROUND,
    },
    text: {
      primary: PRIMARY_TEXT,
      secondary: SECONDARY_TEXT,
      disabled: DISABLED_TEXT,
    },
    success: {
      main: '#3DD755',
      contrastText: '#1E1B27', // Text color that will be readable against the success color
    },
    error: {
      main: '#E04A4A',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#33B6FF',
      contrastText: '#1E1B27',
    },
    // action: {
    //   active: '#FFFFFF',
    //   hover: '#504D59', // Color when an actionable item is hovered
    //   selected: '#3D3945', // Color when an actionable item is selected
    //   disabledBackground: '#3D3945', // Background color for disabled action items
    //   disabled: '#504D59', // Text color for disabled action items
    // },
  },

  typography: {
    fontFamily: ['inter', 'space-grotesk'].join(','),
    body1: {
      color: PRIMARY_TEXT,
      fontWeight: '700',
      fontSize: '14px',
    },
    body2: {
      color: SECONDARY_TEXT,
      fontWeight: '400',
      fontSize: '14px',
    },
    subtitle1: {
      color: THRID_TEXT,
      fontWeight: '700',
      fontSize: '14px',
    },
    subtitle2: {
      color: SECONDARY_TEXT,
      fontWeight: '700',
      fontSize: '14px',
    },
    caption: {
      color: '#827F8B',
      fontFamily: 'Inter',
      fontSize: '11px',
      fontWeight: '400',
      lineHeight: '13px',
      letterSpacing: '0em',
    },
  },
  components: {
    MuiTableHead: {
      styleOverrides: {
        root: {
          font: '11px space-grotesk !important',
        },
      },
    },
    MuiButton: {
      variants: [
        {
          props: { variant: 'rounded' },
          style: {
            backgroundColor: BUTTON_BACKGROUND,
            color: PRIMARY_TEXT,
            border: `2px solid ${BUTTON_BORDER}`,
            fontWeight: '700',
            padding: '0px',
            height: '30px',
            display: 'inline-block',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: BUTTON_BACKGROUND_HOVER,
              color: PRIMARY_TEXT,
              border: '2px solid transparent',
            },
          },
        },
        {
          props: { variant: 'undercover' },
          style: {
            // sx={{ padding: '0px', display: 'block', margin: '5px 0 0 auto', color: '#33B6FF' }}
            margin: '5px 0',
            minWidth: 'auto',
            backgroundColor: 'transparent',
            color: '#33B6FF',
            border: `none`,
            padding: '0px',
            display: 'inline-block',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: BUTTON_BACKGROUND_HOVER,
              color: PRIMARY_TEXT,
            },
          },
        },
      ],

      styleOverrides: {
        contained: {
          backgroundColor: BUTTON_BACKGROUND,
          color: BUTTON_TEXT,
          border: `2px solid ${BUTTON_BORDER}`,
          fontWeight: '700',
          width: '100%',
          height: '32px',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: BUTTON_BACKGROUND_HOVER,
            color: BUTTON_TEXT,
            border: '2px solid transparent',
          },
        },
        outlined: {
          backgroundColor: 'transparent',
          color: BUTTON_2_TEXT,
          border: `2px solid ${BUTTON_2_BORDER}`,
          fontWeight: '700',
          width: '100%',
          height: '40px',
          '&:hover': {
            backgroundColor: BUTTON_BACKGROUND_HOVER,
            color: BUTTON_2_TEXT,
            border: '2px solid transparent',
          },
        },
      },
    },
  },
});

// Augment MUI theme for new variant

import '@mui/material/Button';

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    rounded: true;
    undercover: true;
  }
}

export default theme;
