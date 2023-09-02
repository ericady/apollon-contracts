import { createTheme } from '@mui/material/styles';

import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';

// TODO: Move these into the finally
const PRIMARY_BACKGROUND = '#14111D';
const PAPER_BACKGROUND = '#2A2636';
const PRIMARY_TEXT = '#FFFFFF';
export const SECONDARY_TEXT = '#827F8B';
const DISABLED_TEXT = '#504D59';
const BUTTON_BACKGROUND = '#1E1B27';
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
      main: SECONDARY_TEXT,
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
    fontFamily: ['Inter Variable', 'Space Grotesk Variable'].join(','),
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
      color: DISABLED_TEXT,
      fontWeight: '700',
      fontSize: '14px',
    },
    subtitle2: {
      color: SECONDARY_TEXT,
      fontWeight: '700',
      fontSize: '14px',
      lineHeight: '14.04px',
    },
    caption: {
      color: SECONDARY_TEXT,
      fontSize: '11px',
      fontWeight: '400',
      lineHeight: '13px',
    },
    titleAlternate: {
      //styleName: Title/Title 3;
      fontFamily: 'Space Grotesk Variable',
      fontSize: '11px',
      fontWeight: '700',
      lineHeight: '14px',
      color: SECONDARY_TEXT,
    },
    hint: {
      //styleName: Text/xSmall
      fontSize: '9px',
      fontWeight: '400',
      lineHeight: '11px',
      color: DISABLED_TEXT,
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '11px',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: SECONDARY_TEXT,
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
          color: SECONDARY_TEXT,
          border: `2px solid ${BUTTON_BORDER}`,
          fontWeight: '700',
          width: '100%',
          height: '32px',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: BUTTON_BACKGROUND_HOVER,
            color: SECONDARY_TEXT,
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
    MuiTabs: {
      styleOverrides: {
        flexContainer: {
          borderBottom: 'none',
        },
        indicator: {
          backgroundColor: PRIMARY_TEXT,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        textColorPrimary: {
          color: SECONDARY_TEXT,
          fontWeight: '700',
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

import '@mui/material/styles';
import '@mui/material/Typography';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    titleAlternate: React.CSSProperties;
    hint: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    titleAlternate?: React.CSSProperties;
    hint?: React.CSSProperties;
  }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    titleAlternate: true;
    hint: true;
  }
}
export default theme;
