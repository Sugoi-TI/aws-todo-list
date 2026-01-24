import { useEffect, useState } from "react";
import { createApiRequest } from "@my-app/shared";

type Todo = {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
};

type Props = {
  refreshTrigger: number;
};

const API_URL = import.meta.env.VITE_API_URL;

const TodoList = ({ refreshTrigger }: Props) => {
  const apiRequest = createApiRequest(API_URL);

  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const fetchTodos = async () => {
      apiRequest("/tasks")
        .then((res) => res.json())
        .then((data) => {
          console.log("Todos loaded:", data);
          setTodos(data);
        })
        .catch((err) => console.error("Failed to load tasks", err));
    };

    fetchTodos();
  }, [apiRequest, refreshTrigger]);

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
