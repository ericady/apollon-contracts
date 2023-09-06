import { createTheme } from '@mui/material/styles';

import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';

const PRIMARY_BACKGROUND = '#14111D';
const PAPER_BACKGROUND = '#2A2636';
const PRIMARY_TEXT = '#FFFFFF';
export const SECONDARY_TEXT = '#827F8B';
const DISABLED_TEXT = '#504D59';
export const BUTTON_BACKGROUND = '#1E1B27';
export const BUTTON_BORDER = '#282531';
const BUTTON_2_TEXT = '#ffffff';
const BUTTON_2_BORDER = '#3C3945';
const BUTTON_BACKGROUND_HOVER = '#1D202F';
export const GREEN_BACKGROUND = '#1A2E25';
export const RED_BACKGROUND = '#321923';
export const BLUE_BACKGROUND = '#18293e';
export const FIELDSET_COLOR = '#46434F';

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
      background: 'rgba(61, 215, 85, 0.15)',
      contrastText: '#1E1B27',
    },
    error: {
      main: '#E04A4A',
      background: 'rgba(224, 74, 74, 0.15)',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#33B6FF',
      background: 'rgba(51, 182, 255, 0.15)',
      contrastText: '#1E1B27',
    },
    table: {
      border: BUTTON_BACKGROUND,
    },
  },

  typography: {
    fontFamily: ['Inter Variable', 'Space Grotesk Variable'].join(','),
    h4: {
      fontFamily: 'Space Grotesk Variable',
      color: SECONDARY_TEXT,
      fontWeight: '700',
      fontSize: '20px',
    },
    h6: {
      //styleName: Title/Title 1;
      fontFamily: 'Space Grotesk Variable',
      fontSize: '19.5px',
      fontWeight: '700',
    },
    body1: {
      color: PRIMARY_TEXT,
      fontWeight: '700',
      fontSize: '14px',
    },
    body2: {
      color: SECONDARY_TEXT,
      fontWeight: '400',
      fontSize: '11.7px',
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
      fontSize: '14.3px',
      fontWeight: '400',
      lineHeight: '13px',
    },
    titleAlternate: {
      //styleName: Title/Title 3;
      fontFamily: 'Space Grotesk Variable',
      fontSize: '14.3px',
      fontWeight: '700',
      lineHeight: '14px',
      color: SECONDARY_TEXT,
    },
    hint: {
      //styleName: Text/xSmall
      fontSize: '11.7px',
      fontWeight: '400',
      lineHeight: '11px',
      color: DISABLED_TEXT,
    },
    label: {
      fontFamily: 'Space Grotesk Variable',
      color: '#3C3945',
      fontWeight: '700',
      fontSize: '11.7px',
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: SECONDARY_TEXT,
          fontSize: '14.3px',
          borderBottom: '1px solid',
          borderColor: BUTTON_BACKGROUND,
          padding: '10px 15px',
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

    MuiInputBase: {
      styleOverrides: {
        root: {
          '& fieldset': {
            borderColor: FIELDSET_COLOR, // change border color
            borderWidth: '1px', // change border thickness
          },
        },
        input: {
          '&::placeholder': {
            color: DISABLED_TEXT, // change placeholder color
          },
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
          height: '30px',
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
    label: React.CSSProperties;
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    titleAlternate?: React.CSSProperties;
    hint?: React.CSSProperties;
    label?: React.CSSProperties;
  }

  interface PaletteOptions {
    table: {
      border: string;
    };
  }

  interface Palette {
    table: {
      border: string;
    };
  }

  interface PaletteColorOptions {
    main: string;
    contrastText: string;
    background?: string;
  }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    titleAlternate: true;
    hint: true;
    label: true;
  }
}

export default theme;
