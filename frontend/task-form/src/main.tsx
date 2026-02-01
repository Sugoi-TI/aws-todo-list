import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TaskForm from "./task-form.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TaskForm onSuccess={() => null} />
  </StrictMode>,
);
