import { useEffect, useState } from "react";
import { useApi, useAppStore } from "@my-app/frontend-shared";
import { type GetTasksResponseDto } from "@my-app/shared";

type Props = {
  refreshTrigger: number;
};

const taskList = ({ refreshTrigger }: Props) => {
  const [tasks, setTasks] = useState<GetTasksResponseDto>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [sharingTaskId, setSharingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskMessage, setEditingTaskMessage] = useState("");
  const [userIdForSharing, setUserIdForSharing] = useState("");

  const { theme } = useAppStore();
  const api = useApi();

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      api("/tasks")
        .then((res) => res.json())
        .then((data: GetTasksResponseDto) => {
          console.log("tasks loaded:", data);
          setTasks(data);
        })
        .catch((err) => console.error("Failed to load tasks", err))
        .finally(() => setIsLoading(false));
    };

    fetchTasks();
  }, [api, refreshTrigger]);

  const handleEdit = (taskId: string) => {
    const task = tasks.find((t) => t.taskId === taskId);

    if (task) {
      setEditingTaskTitle(task.title);
      setEditingTaskMessage(task.message);

      setEditingTaskId(taskId);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskTitle("");
    setEditingTaskMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingTaskTitle || !editingTaskMessage) return;

    try {
      const response = await api(`/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingTaskTitle,
          message: editingTaskMessage,
        }),
      });

      if (response.ok) {
        console.log("Task updated successfully");

        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.taskId === editingTaskId
              ? { ...task, title: editingTaskTitle, message: editingTaskMessage }
              : task,
          ),
        );

        setEditingTaskId(null);
        setEditingTaskTitle("");
        setEditingTaskMessage("");
      } else {
        console.error("Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const response = await api(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("Task deleted successfully");
        setTasks((prevTasks) => prevTasks.filter((task) => task.taskId !== taskId));
      } else {
        console.error("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleShare = async (taskId: string) => {
    if (sharingTaskId === taskId) {
      setSharingTaskId(null);
      setUserIdForSharing("");
      return;
    }

    setSharingTaskId(taskId);
    setUserIdForSharing("");
  };

  const handleShareSubmit = async (taskId: string) => {
    if (!userIdForSharing.trim()) {
      return;
    }

    try {
      const response = await api(`/tasks/${taskId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userIdForSharing.trim(),
        }),
      });

      if (response.ok) {
        console.log("Task shared successfully");
        setSharingTaskId(null);
        setUserIdForSharing("");
      } else {
        console.error("Failed to share task");
      }
    } catch (error) {
      console.error("Error sharing task:", error);
    }
  };

  return (
    <div style={{ border: "1px solid green", padding: "10px", margin: "10px" }}>
      <h3>Micro-frontend: List</h3>
      <p>Theme: {theme}</p>
      <ul>
        {isLoading
          ? "Loading..."
          : tasks.map((task) => (
              <li key={task.taskId}>
                {editingTaskId === task.taskId ? (
                  // Режим редактирования
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      padding: "10px",
                      backgroundColor: "#f0f0f0",
                    }}
                  >
                    <input
                      type="text"
                      value={editingTaskTitle}
                      onChange={(e) => {
                        setEditingTaskTitle(e.target.value);
                      }}
                      style={{
                        width: "30%",
                        boxSizing: "border-box",
                      }}
                    />
                    <input
                      type="text"
                      value={editingTaskMessage}
                      onChange={(e) => {
                        setEditingTaskMessage(e.target.value);
                      }}
                      style={{
                        width: "30%",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ marginTop: "16px" }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{ padding: "5px 10px", marginRight: "10px" }}
                      >
                        Save
                      </button>
                      <button onClick={handleCancelEdit} style={{ padding: "5px 10px" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <b>{task.title}</b>: {task.message}
                    <div style={{ marginTop: "10px" }}>
                      <button
                        onClick={() => handleEdit(task.taskId)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          marginRight: "10px",
                        }}
                        title="Edit"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20H16C16.5304 20 17.0391 19.7893 17.4142 19.4142C17.7893 19.0391 18 18.5304 18 18V11"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89783 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(task.taskId)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          marginRight: "10px",
                        }}
                        title="Delete"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3 6H5H21"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M10 11V17M14 11V17M19 6V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V6H19Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleShare(task.taskId)}
                        style={{ border: "none", background: "none", cursor: "pointer" }}
                        title="Share"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M18 12H19C19.5304 12 20.0391 11.7893 20.4142 11.4142C20.7893 11.0391 21 10.5304 21 10V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V10C3 10.5304 3.21071 11.0391 3.58579 11.4142C3.96086 11.7893 4.46957 12 5 12H6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15V19M16 15V19M8 15V19"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M21 15H3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {sharingTaskId === task.taskId && (
                  <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f0f0f0" }}>
                    <input
                      type="text"
                      value={userIdForSharing}
                      onChange={(e) => setUserIdForSharing(e.target.value)}
                      placeholder="Enter user ID to share with"
                      style={{ marginRight: "10px", padding: "5px" }}
                    />
                    <button
                      onClick={() => handleShareSubmit(task.taskId)}
                      style={{ padding: "5px 10px" }}
                    >
                      Share
                    </button>
                    <button
                      onClick={() => {
                        setSharingTaskId(null);
                        setUserIdForSharing("");
                      }}
                      style={{ padding: "5px 10px", marginLeft: "5px" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {task.s3Key && (
                  <div>
                    <img
                      src={task.s3Key}
                      alt={task.fileName || "Task attachment"}
                      style={{ maxWidth: "200px", maxHeight: "200px", marginTop: "10px" }}
                    />
                  </div>
                )}
              </li>
            ))}
      </ul>
    </div>
  );
};

export default taskList;
