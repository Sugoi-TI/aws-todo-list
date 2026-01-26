import { useEffect, useState } from "react";
import type { ApiClient } from "@my-app/shared";

type Todo = {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
};

type Props = {
  apiClient: ApiClient;
  refreshTrigger: number;
};

const TodoList = ({ apiClient, refreshTrigger }: Props) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const fetchTodos = async () => {
      apiClient("/tasks")
        .then((res) => res.json())
        .then((data) => {
          console.log("Todos loaded:", data);
          setTodos(data);
        })
        .catch((err) => console.error("Failed to load tasks", err));
    };

    fetchTodos();
  }, [apiClient, refreshTrigger]);

  return (
    <div style={{ border: "1px solid green", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: List</h3>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <b>{todo.title}</b>: {todo.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
