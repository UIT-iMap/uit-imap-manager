import { UserProvider, useUser } from "./contexts/userContext";
import { DataProvider } from "./contexts/dataContext";
import { TabProvider, useTab } from "./contexts/tabContext";
import Login from "./components/main/Login";
import RightBar from "./components/main/RightBar";
import Topbar from "./components/main/Topbar";
import Table from "./components/main/Table";
import Shortcuts from "./components/main/Shortcuts";
import ModelViewer from "./components/main/model/ModelViewer";
import ScenesPreview from "./components/main/tour/ScenesPreview";
import { ModelProvider } from "./contexts/modelContext";
import { PanoProvider } from "./contexts/panoContext";

function Workspace() {
  const { tab } = useTab();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        {tab === "model" ? (
          <ModelViewer />
        ) : tab === "tourScenes" ? (
          <ScenesPreview />
        ) : tab === "guide" ? (
          <iframe
            src="/manager/guide.pdf"
            className="h-full w-full border-0"
            title="User Guide"
          />
        ) : (
          <Table />
        )}
      </main>
      <RightBar />
      <Shortcuts />
    </div>
  );
}

function Gate() {
  const { isAuthed, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-500">
            Checking authentication...
          </span>
        </div>
      </div>
    );
  }

  // if (!isAuthed) return <Login />;
  return (
    <DataProvider>
      <TabProvider>
        <ModelProvider>
          <PanoProvider>
            <Workspace />
          </PanoProvider>
        </ModelProvider>
      </TabProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Gate />
    </UserProvider>
  );
}
