import { useEffect, useState } from "react";

type Todo = {
    id: string;
    title: string;
    message: string;
    status: string;
    createdAt: string;
};

type Props = {
    apiUrl: string;
    refreshTrigger: number;
};

const TodoList = ({ apiUrl, refreshTrigger }: Props) => {
    const [todos, setTodos] = useState<Todo[]>([]);

    useEffect(() => {
        // const res = await fetch(`${apiUrl}/tasks`);
        console.log("Fetching list from:", apiUrl);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTodos([{ id: "1", title: "Mock Task", message: "Hello from MF", status: "NEW", createdAt: new Date().toISOString() }]);
    }, [apiUrl, refreshTrigger]);

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