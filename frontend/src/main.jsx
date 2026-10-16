import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SavedProvider } from "./context/SavedProvider.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SavedProvider>
          <App />
        </SavedProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
