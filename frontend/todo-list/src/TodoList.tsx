import { useEffect, useState } from "react";
import { apiContext } from "@my-app/shared";

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

const TodoList = ({ refreshTrigger }: Props) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const api = apiContext.useApi();

  useEffect(() => {
    const fetchTodos = async () => {
      api("/tasks")
        .then((res) => res.json())
        .then((data) => {
          console.log("Todos loaded:", data);
          setTodos(data);
        })
        .catch((err) => console.error("Failed to load tasks", err));
    };

    fetchTodos();
  }, [api, refreshTrigger]);

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
