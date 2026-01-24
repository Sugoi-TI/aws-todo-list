import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TodoForm from "./TodoForm.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodoForm apiUrl="" userId="123" onSuccess={() => null} />
  </StrictMode>,
);
