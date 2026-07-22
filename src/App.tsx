import { UserProvider, useUser } from "./contexts/userContext";
import { LogProvider } from "./contexts/logContext";
import { DataProvider } from "./contexts/dataContext";
import { TabProvider, useTab } from "./contexts/tabContext";
import Login from "./components/main/Login";
import RightBar from "./components/main/RightBar";
import Topbar from "./components/main/Topbar";
import Table from "./components/main/Table";
import Shortcuts from "./components/main/Shortcuts";
import ModelViewer from "./components/main/model/ModelViewer";
import FloorPreview from "./components/main/FloorPreview";
import { ModelProvider } from "./contexts/modelContext";
import { FloorProvider } from "./contexts/floorContext";

function Workspace() {
  const { tab } = useTab();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        {tab === "model" ? (
          <ModelViewer />
        ) : tab === "floorPreview" ? (
          <FloorPreview />
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
  const { isAuthed } = useUser();
  if (!isAuthed) return <Login />;
  return (
    <LogProvider>
      <DataProvider>
        <TabProvider>
          <ModelProvider>
            <FloorProvider>
              <Workspace />
            </FloorProvider>
          </ModelProvider>
        </TabProvider>
      </DataProvider>
    </LogProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Gate />
    </UserProvider>
  );
}
