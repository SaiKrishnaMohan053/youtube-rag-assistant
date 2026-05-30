import { createTheme } from '@mui/material/styles';

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#635bff',
      light: '#8b85ff',
      dark: '#3f37c9',
    },
    secondary: {
      main: '#00c2ff',
    },
    background: {
      default: '#f5f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#dc2626',
    },
  },

  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 900,
      letterSpacing: '-0.05em',
    },
    h2: {
      fontWeight: 900,
      letterSpacing: '-0.04em',
    },
    h3: {
      fontWeight: 850,
      letterSpacing: '-0.035em',
    },
    h4: {
      fontWeight: 850,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 800,
    },
    h6: {
      fontWeight: 800,
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },

  shape: {
    borderRadius: 18,
  },

  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.06)',
    '0 4px 12px rgba(15,23,42,0.08)',
    '0 8px 24px rgba(15,23,42,0.10)',
    '0 12px 32px rgba(15,23,42,0.12)',
    '0 18px 48px rgba(15,23,42,0.16)',
    ...Array(19).fill('0 18px 48px rgba(15,23,42,0.16)'),
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at top left, rgba(99,91,255,0.14), transparent 32%), #f5f7fb',
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 42,
        },
        contained: {
          boxShadow: '0 12px 28px rgba(99,91,255,0.28)',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: '1px solid rgba(148,163,184,0.22)',
          boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: '#ffffff',
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
        },
      },
    },
  },
});

export default appTheme;