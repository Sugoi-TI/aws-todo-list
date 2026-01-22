import { useState, Suspense, lazy } from "react";

// @ts-ignore
const RemoteTodoForm = lazy(() => import("todoForm/TodoForm"));
// @ts-ignore
const RemoteTodoList = lazy(() => import("todoList/TodoList"));

const API_URL = "https://vuci74twf2.execute-api.eu-central-1.amazonaws.com";
const USER_ID = "frontend_user_1";

function App() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSuccess = () => {
        console.log("Task created! Refreshing list...");
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <div style={{ fontFamily: "Arial", padding: "20px" }}>
            <h1>Todo Micro-Frontends App</h1>
            <p>Host Application</p>

            <Suspense fallback={<div>Loading Form...</div>}>
                <RemoteTodoForm
                    apiUrl={API_URL}
                    userId={USER_ID}
                    onSuccess={handleSuccess}
                />
            </Suspense>

            <Suspense fallback={<div>Loading List...</div>}>
                <RemoteTodoList
                    apiUrl={API_URL}
                    refreshTrigger={refreshTrigger}
                />
            </Suspense>
        </div>
    );
}

export default App;