import { useState } from "react";
import ToDoNavbar from "./ToDoNavbar";
import Today from "./Today";
import Upcomming from "./Upcomming";
import Schedule from "./Schedule";
import Important from "./Important";
import { DEFAULT_CATEGORIES, DEFAULT_IMPORTANT_CATEGORIES } from "./todoShared";

export default function Todo() {
  const [active, setActive] = useState("today");
  const [tasks, setTasks] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);
  const [importantCategories, setImportantCategories] = useState(DEFAULT_IMPORTANT_CATEGORIES);

  const streak = { current: 6, best: 12 };

  const section = {
    today:     <Today />,
    upcoming:  <Upcomming />,
    schedule: (
      <Schedule
        tasks={tasks}
        setTasks={setTasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
    important: (
      <Important
        tasks={tasks}
        categoryOptions={categoryOptions}
        setCategoryOptions={setCategoryOptions}
        importantCategories={importantCategories}
        setImportantCategories={setImportantCategories}
      />
    ),
  };

  return (
    <div className="mx-auto max-w-8xl space-y-4">

      {/* TOP ROW — streak + navbar side by side, left-aligned */}
      <div className="flex items-center gap-20">

        {/* STREAK */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0
          bg-amber-950/50 border border-amber-500/25 shadow-lg">
          <div className="text-xl">🔥</div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-amber-400">
              {streak.current} day streak
            </span>
          </div>
        </div>

        {/* NAVBAR — takes remaining space */}
        <div className="flex-1 min-w-0">
          <ToDoNavbar active={active} onChange={setActive} />
        </div>

      </div>

      {/* CONTENT */}
      <div>{section[active]}</div>

    </div>
  );
}
