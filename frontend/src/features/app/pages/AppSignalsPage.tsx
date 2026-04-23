import { Navigate } from "react-router-dom";

/** Rota legada: conteúdo de “Meus sinais” passou para a home (`/app/inicio`). */
export default function AppSignalsPage() {
  return <Navigate to="/app/inicio" replace />;
}
