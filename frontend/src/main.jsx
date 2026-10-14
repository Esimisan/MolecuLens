import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SavedProvider } from "./context/SavedProvider.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import useAuth from "./hooks/useAuth.js";
import "./index.css";
import App from "./App.jsx";

function SavedProviderByUser({ children }) {
  const { user, status } = useAuth();
  // Wait until the server has said who we are
  if (status === "loading") return null;
  // A new key makes React start a fresh SavedProvider
  return <SavedProvider key={user?.id ?? "guest"}>{children}</SavedProvider>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SavedProviderByUser>
          <App />
        </SavedProviderByUser>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
