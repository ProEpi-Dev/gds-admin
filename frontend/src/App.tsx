import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import type { ReactNode } from "react";
import theme from "./theme/theme";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes/AppRoutes";

/** Alinha com `UserLayout` (`mb: 10`) para o snackbar não cobrir o bottom navigation no app participante. */
const NOTISTACK_BOTTOM_OFFSET_CLASS = "gds-notistack-offset-bottom-nav";

function NotistackWithBottomOffset({ children }: { children: ReactNode }) {
  const muiTheme = useTheme();
  const bottom = `calc(${muiTheme.spacing(10)} + env(safe-area-inset-bottom, 0px))`;
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      autoHideDuration={5000}
      classes={{
        containerAnchorOriginBottomRight: NOTISTACK_BOTTOM_OFFSET_CLASS,
        containerAnchorOriginBottomCenter: NOTISTACK_BOTTOM_OFFSET_CLASS,
        containerAnchorOriginBottomLeft: NOTISTACK_BOTTOM_OFFSET_CLASS,
      }}
    >
      <GlobalStyles
        styles={{
          [`.${NOTISTACK_BOTTOM_OFFSET_CLASS}`]: {
            bottom: `${bottom} !important`,
          },
        }}
      />
      {children}
    </SnackbarProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotistackWithBottomOffset>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </NotistackWithBottomOffset>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
