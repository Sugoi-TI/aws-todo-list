import { useState, Suspense, lazy } from "react";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { ApiProvider, createApiClient, useAppStore } from "@my-app/frontend-shared";

// @ts-ignore
const RemoteTodoForm = lazy(() => import("todoForm/TodoForm"));
// @ts-ignore
const RemoteTodoList = lazy(() => import("todoList/TodoList"));

const API_URL = import.meta.env.VITE_API_URL;
const authorizedApiClient = createApiClient(API_URL);

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { theme, toggleTheme } = useAppStore();

  const handleSuccess = () => {
    console.log("Task created! Refreshing list...");
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <ApiProvider api={authorizedApiClient}>
          <div style={{ fontFamily: "Arial", padding: "20px" }}>
            <h1>Todo Micro-Frontends App</h1>
            <p>Host Application</p>
            <p>User: {user?.username}</p>
            <p>Theme: {theme}</p>
            <button onClick={signOut}>SignOut</button>
            <button onClick={toggleTheme}>Change theme</button>

            <Suspense fallback={<div>Loading Form...</div>}>
              <RemoteTodoForm onSuccess={handleSuccess} />
            </Suspense>

            <Suspense fallback={<div>Loading List...</div>}>
              <RemoteTodoList refreshTrigger={refreshTrigger} />
            </Suspense>
          </div>
        </ApiProvider>
      )}
    </Authenticator>
  );
}

export default App;
