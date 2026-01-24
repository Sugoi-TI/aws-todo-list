import { useState } from "react";
import { createApiRequest } from "@my-app/shared";

type Props = {
  onSuccess: () => void;
};

const API_URL = import.meta.env.VITE_API_URL;

const TodoForm = ({ onSuccess }: Props) => {
  const apiRequest = createApiRequest(API_URL);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    try {
      const response = await apiRequest("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });

      if (response.ok) {
        setTitle("");
        setMessage("");
        onSuccess();
      }
    } catch (error) {
      console.error("Error posting todo:", error);
    }
  };

  return (
    <div style={{ border: "1px solid blue", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: Form</h3>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default TodoForm;
