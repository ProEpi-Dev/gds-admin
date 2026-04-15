import { createTheme, type ThemeOptions } from '@mui/material/styles';

/** Paleta e tipografia do Theme Builder; raios e inputs alinhados ao uso real (admin + app). */
export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',

    primary: {
      main: '#159A9C',
      light: '#1FB5B8',
      dark: '#0F6F73',
      contrastText: '#FFFFFF',
    },

    secondary: {
      main: '#0B4F53',
      contrastText: '#FFFFFF',
    },

    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },

    text: {
      primary: '#1A1A1A',
      secondary: '#6B6B6B',
    },

    grey: {
      100: '#F5F5F5',
      200: '#E0E0E0',
      300: '#CFCFCF',
      400: '#BDBDBD',
    },
  },

  /** Cartões e superfícies; botões e inputs usam override menor para não parecerem “pílula”. */
  shape: {
    borderRadius: 10,
  },

  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          padding: theme.spacing(1, 2),
        }),
        sizeLarge: ({ theme }) => ({
          padding: theme.spacing(1.25, 2.5),
        }),
        sizeSmall: ({ theme }) => ({
          padding: theme.spacing(0.5, 1.25),
        }),
        containedPrimary: {
          backgroundColor: '#0B4F53',
          '&:hover': {
            backgroundColor: '#083B3E',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          backgroundColor: theme.palette.background.paper,
          '& fieldset': {
            borderWidth: 1,
            borderColor: theme.palette.grey[300],
          },
          '&:hover fieldset': {
            borderColor: theme.palette.grey[400],
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1,
            borderColor: theme.palette.primary.main,
          },
        }),
      },
    },
  },
};

const theme = createTheme(themeOptions);

export default theme;
