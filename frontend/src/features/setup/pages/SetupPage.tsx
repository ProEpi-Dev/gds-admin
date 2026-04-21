import { Container, Paper, Typography, Box } from "@mui/material";
import SetupForm from "../components/SetupForm";

export default function SetupPage() {
  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        overflowY: "scroll",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 820,
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Configuração Inicial
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 4 }}
          >
            Configure o sistema pela primeira vez
          </Typography>
          <SetupForm />
        </Paper>
      </Box>
    </Container>
  );
}
