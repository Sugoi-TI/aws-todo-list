import { useState } from "react";
import { apiContext } from "@my-app/shared";

type Props = {
  onSuccess: () => void;
};

const TodoForm = ({ onSuccess }: Props) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const api = apiContext.useApi();

  const handleSubmit = async () => {
    try {
      const response = await api("/tasks", {
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
