import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TaskList from "./task-list.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TaskList refreshTrigger={0} />
  </StrictMode>,
);
