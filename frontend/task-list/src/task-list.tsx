import { useEffect, useState } from "react";
import { useApi, useAppStore } from "@my-app/frontend-shared";
import { type TaskTable } from "@my-app/shared";

type Props = {
  refreshTrigger: number;
};

const taskList = ({ refreshTrigger }: Props) => {
  const [tasks, setTasks] = useState<TaskTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useAppStore();
  const api = useApi();

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      api("/tasks")
        .then((res) => res.json())
        .then((data) => {
          console.log("tasks loaded:", data);
          setTasks(data);
        })
        .catch((err) => console.error("Failed to load tasks", err))
        .finally(() => setIsLoading(false));
    };

    fetchTasks();
  }, [api, refreshTrigger]);

  return (
    <div style={{ border: "1px solid green", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: List</h3>
      <p>Theme: {theme}</p>
      <ul>
        {isLoading
          ? "Loading..."
          : tasks.map((task) => (
              <li key={task.taskId}>
                <b>{task.title}</b>: {task.message}
              </li>
            ))}
      </ul>
    </div>
  );
};

export default taskList;
