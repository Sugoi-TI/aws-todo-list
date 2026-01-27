import { useState } from "react";
import { apiContext, useAppStore } from "@my-app/shared";

type Props = {
  onSuccess: () => void;
};

const TodoForm = ({ onSuccess }: Props) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useAppStore();
  const api = apiContext.useApi();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await api("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });

      if (response.ok) {
        setTitle("");
        setMessage("");
        setTimeout(() => {
          onSuccess();
          setIsLoading(false);
        }, 200);
      }
    } catch (error) {
      console.error("Error posting todo:", error);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid blue", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: Form</h3>
      <p>Theme: {theme}</p>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSubmit}>{isLoading ? "Loading..." : "Submit"}</button>
    </div>
  );
};

export default TodoForm;
