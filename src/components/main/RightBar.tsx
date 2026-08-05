import { useTab, TAB_GROUPS } from "../../contexts/tabContext";

export default function RightBar() {
  const { tab, setTab } = useTab();

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col gap-1 border-l border-slate-200 bg-white p-3">
      <div className="mb-2 px-1">
        <h1 className="text-sm font-bold tracking-tight text-slate-800">
          UIT <span className="text-sky-500">iMap</span> Manager
        </h1>
      </div>
      {TAB_GROUPS.map((group, index) => (
        <div key={group.name} className="flex flex-col gap-1">
          {index > 0 && <div className="my-1 border-t border-slate-200" />}
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.name}
          </div>
          {group.tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all hover:scale-95 active:scale-90 ${
                  active
                    ? "bg-sky-400 text-white hover:bg-sky-500"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {label.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
