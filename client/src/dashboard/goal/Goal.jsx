import { AnimatePresence, motion as Motion } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useMobileLowMotion from "../../hooks/useMobileLowMotion";
import GoalNav from "./GoalNav";
import { GOAL_TABS } from "./goalTabs";
import { GoalContext } from "./goalContext";
import useGoalData from "./useGoalData";

const GOAL_TAB_IDS = new Set(GOAL_TABS.map(tab => tab.id));
const loadMyGoals = () => import("./Mygoals");
const loadCreateGoals = () => import("./CreateGoal");
const loadProgress = () => import("./Progress");
const viewLoaders = { "my-goals": loadMyGoals, "create-goals": loadCreateGoals, progress: loadProgress };
const Mygoals = lazy(loadMyGoals);
const CreateGoal = lazy(loadCreateGoals);
const Progress = lazy(loadProgress);

export default function Goal() {
  const { isDemoMode, user } = useAuth();
  return <GoalContent key={isDemoMode ? "demo" : user?.id || "guest"} />;
}

function GoalContent() {
  const { isDemoMode } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lowMotion = useMobileLowMotion();
  const requestedTab = searchParams.get("tab") || location.state?.tab;
  const [activeTab, setActiveTab] = useState(GOAL_TAB_IDS.has(requestedTab) ? requestedTab : "my-goals");
  const data = useGoalData(isDemoMode, activeTab === "create-goals");
  useEffect(() => { setActiveTab(GOAL_TAB_IDS.has(requestedTab) ? requestedTab : "my-goals"); }, [requestedTab]);
  useEffect(() => { void viewLoaders[activeTab]?.(); }, [activeTab]);
  const changeActiveTab = tab => {
    setActiveTab(tab);
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      if (tab !== "create-goals") next.delete("goalCreate");
      return next;
    });
  };
  const visibleGoals = useMemo(() => data.goals.filter(goal => !goal.deletedAt && goal.archiveReason !== "deleted"), [data.goals]);
  const importantByGoal = useMemo(() => Object.fromEntries(data.goals.map(goal => [goal.id, Boolean(goal.isImportant)])), [data.goals]);
  const milestonesByGoal = useMemo(() => Object.fromEntries(data.goals.map(goal => [goal.id, goal.milestones])), [data.goals]);
  const toggleImportant = async goalId => {
    const goal = data.goals.find(item => item.id === goalId);
    if (!goal || data.busy) return;
    try { await data.mutate("patch", `/goals/${goalId}/important`, { isImportant: !goal.isImportant }); }
    catch { /* The shared action banner retains the failure across tabs. */ }
  };
  const renderContent = () => {
    if (activeTab === "create-goals") return <CreateGoal />;
    if (activeTab === "progress") return <Progress goals={visibleGoals} importantByGoal={importantByGoal} milestonesByGoal={milestonesByGoal} />;
    return <Mygoals goals={visibleGoals} importantByGoal={importantByGoal} milestonesByGoal={milestonesByGoal}
      onToggleImportant={toggleImportant}
      onAddSubgoal={({ goalId, title, deadline }) => data.mutate("post", `/goals/${goalId}/subgoals`, { title, deadline })}
      onUpdateSubgoalStatus={({ goalId, subgoalId, completed }) => data.mutate("patch", `/goals/${goalId}/subgoals/${subgoalId}/progress`, { completed })}
      onDeleteSubgoal={({ goalId, subgoalId }) => data.mutate("delete", `/goals/${goalId}/subgoals/${subgoalId}`)} />;
  };
  return (
    <GoalContext.Provider value={data}>
      <div className="goals-page w-full" data-active={activeTab}>
        <div className="goals-top-row hidden min-w-0 flex-1 sm:block"><GoalNav activeTab={activeTab} onTabChange={changeActiveTab} onPrefetch={(tab) => viewLoaders[tab]?.()} /></div>
        {(data.loadError || (activeTab === "create-goals" && data.logsError)) && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-950/20 p-3 text-sm text-rose-200">
          {data.loadError || data.logsError} <button type="button" disabled={data.saving} className="ml-2 underline" onClick={data.refresh}>Retry</button>
        </div>}
        {data.actionError && <p role="alert" className="p-3 text-sm text-rose-200">{data.actionError}</p>}
        {data.writeBlocked && <div role="alert" className="p-3 text-sm text-rose-200">
          <p>The last change could not be confirmed or conflicted. Reload before another change. Reloading replaces open drafts.</p>
          <button type="button" disabled={data.saving} className="mt-2 underline" onClick={() => data.refresh({ recover: true })}>Reload goals (replaces drafts)</button>
        </div>}
        {data.warning && <p role="status" className="p-3 text-sm text-amber-200">{data.warning}</p>}
        {!data.ready ? <p className="p-6 text-sm text-stone-400">{data.loadError ? "Your goals could not be loaded." : "Loading your goals..."}</p> : (
          <Suspense fallback={<p role="status" className="p-6 text-sm text-stone-400">Loading {activeTab === "create-goals" ? "goal editor" : activeTab === "progress" ? "goal progress" : "your goals"}…</p>}>
            {lowMotion ? (
              <div key={`${activeTab}-${data.recoveryEpoch}`} className="goals-content">{renderContent()}</div>
            ) : (
              <AnimatePresence mode="wait"><Motion.div key={`${activeTab}-${data.recoveryEpoch}`} className="goals-content" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeInOut" }}>{renderContent()}</Motion.div></AnimatePresence>
            )}
          </Suspense>
        )}
      </div>
    </GoalContext.Provider>
  );
}
