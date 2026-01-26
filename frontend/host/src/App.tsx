import { useState, Suspense, lazy } from "react";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { createApiClient } from "@my-app/shared";

// @ts-ignore
const RemoteTodoForm = lazy(() => import("todoForm/TodoForm"));
// @ts-ignore
const RemoteTodoList = lazy(() => import("todoList/TodoList"));

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    console.log("Task created! Refreshing list...");
    setRefreshTrigger((prev) => prev + 1);
  };

  const apiClient = createApiClient(API_URL);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={{ fontFamily: "Arial", padding: "20px" }}>
          <h1>Todo Micro-Frontends App</h1>
          <p>Host Application</p>
          <p>User: {user?.username}</p>
          <button onClick={signOut}>SignOut</button>

          <Suspense fallback={<div>Loading Form...</div>}>
            <RemoteTodoForm apiUrl={apiClient} onSuccess={handleSuccess} />
          </Suspense>

          <Suspense fallback={<div>Loading List...</div>}>
            <RemoteTodoList apiUrl={apiClient} refreshTrigger={refreshTrigger} />
          </Suspense>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
