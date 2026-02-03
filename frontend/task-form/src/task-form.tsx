import { useState, type ChangeEvent } from "react";
import { useApi, useAppStore } from "@my-app/frontend-shared";

type Props = {
  onSuccess: () => void;
};

const TaskForm = ({ onSuccess }: Props) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useAppStore();
  const api = useApi();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setFileError(null);
      return;
    }

    // Validate file size (500KB max)
    if (selectedFile.size > 500 * 1024) {
      setFileError("File size must be less than 500KB");
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setFileError("Only image files are allowed");
      setFile(null);
      return;
    }

    setFileError(null);
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFileError("Title is required");
      return;
    }

    setIsLoading(true);
    setFileError(null);

    try {
      // TODO add type
      const taskData = {
        title,
        message,
        ...(file && {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      };

      const response = await api("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const { taskId, presignedUrl, fileId } = await response.json();

      console.log(presignedUrl);
      console.log(file);

      if (presignedUrl && file) {
        // S3 presigned URL is pre-signed, so we don't need Authorization
        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${uploadResponse.status}`);
        }
      }

      setTitle("");
      setMessage("");
      setFile(null);
      setTimeout(() => {
        onSuccess();
        setIsLoading(false);
      }, 500);
    } catch (err) {
      console.error("Error creating task or uploading file:", err);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid blue", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: Form</h3>
      <p>Theme: {theme}</p>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {fileError && <p style={{ color: "red" }}>{fileError}</p>}
      <button onClick={handleSubmit}>{isLoading ? "Loading..." : "Submit"}</button>
    </div>
  );
};

export default TaskForm;
