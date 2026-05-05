import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { GOALS } from "../../../data/GoalDummyData";
import CreateGoal from "./CreateGoal";
import GoalNav from "./GoalNav";
import Mygoals from "./Mygoals";
import Progress from "./Progress";

const GOAL_TABS = new Set(["my-goals", "create-goals", "progress"]);
const toISODate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toTypeLabel = (goalType) => (goalType === "long-term" ? "Long-term" : "Short-term");

const getStatusFromDeadline = (deadline) => {
  if (!deadline) return "Active";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  return deadlineDate < today ? "Archived" : "Active";
};

const normalizeGoal = (goal) => {
  const goalType = goal.goalType || (String(goal.type || "").toLowerCase().includes("long") ? "long-term" : "short-term");
  const deadline = toISODate(goal.deadline);
  return {
    ...goal,
    id: goal.id || goal._id,
    goalType,
    type: toTypeLabel(goalType),
    startDate: toISODate(goal.startDate),
    deadline,
    status: goal.status || getStatusFromDeadline(deadline),
    milestones: Array.isArray(goal.milestones) ? goal.milestones : []
  };
};

const createDemoImportantMap = () => ({ "gate-2027": true });
const createDemoMilestonesMap = () => Object.fromEntries(GOALS.map((goal) => [goal.id, goal.milestones]));
const buildMilestonesMapFromGoals = (goalList = []) => {
  const map = {};
  goalList.forEach((goal) => {
    map[goal.id] = Array.isArray(goal.milestones) ? goal.milestones : [];
  });
  return map;
};
const emitGoalsUpdated = () => {
  window.dispatchEvent(new Event("monkmode:goals-updated"));
};

export default function Goal() {
  const { isDemoMode } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab") || location.state?.tab;
    return GOAL_TABS.has(requestedTab) ? requestedTab : "my-goals";
  });
  const [goals, setGoals] = useState([]);
  const [importantByGoal, setImportantByGoal] = useState({});
  const [milestonesByGoal, setMilestonesByGoal] = useState({});

  useEffect(() => {
    let isMounted = true;

    const applyGoalsState = (goalList) => {
      if (!isMounted) return;
      setGoals(goalList);
      setImportantByGoal((prev) => {
        if (isDemoMode) return createDemoImportantMap();
        const mapped = {};
        goalList.forEach((goal) => {
          mapped[goal.id] = Boolean(goal.isImportant);
        });
        return { ...prev, ...mapped };
      });
      setMilestonesByGoal((prev) => {
        if (isDemoMode) return createDemoMilestonesMap();
        return { ...prev, ...buildMilestonesMapFromGoals(goalList) };
      });
    };

    const loadGoals = async () => {
      if (isDemoMode) {
        applyGoalsState(GOALS.map(normalizeGoal));
        return;
      }

      try {
        const { data } = await api.get("/goals");
        const normalizedGoals = Array.isArray(data) ? data.map(normalizeGoal) : [];
        applyGoalsState(normalizedGoals);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch goals:", error);
        applyGoalsState([]);
      }
    };

    loadGoals();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const refreshGoals = async () => {
    if (isDemoMode) {
      setGoals(GOALS.map(normalizeGoal));
      return;
    }
    try {
      const { data } = await api.get("/goals");
      const normalizedGoals = Array.isArray(data) ? data.map(normalizeGoal) : [];
      setGoals(normalizedGoals);
      setImportantByGoal((prev) => {
        const mapped = {};
        normalizedGoals.forEach((goal) => {
          mapped[goal.id] = Boolean(goal.isImportant);
        });
        return { ...prev, ...mapped };
      });
      setMilestonesByGoal((prev) => {
        return { ...prev, ...buildMilestonesMapFromGoals(normalizedGoals) };
      });
    } catch (error) {
      console.error("Failed to refresh goals:", error);
    }
  };

  const handleToggleImportant = async (goalId) => {
    if (isDemoMode) {
      setImportantByGoal((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
      return;
    }

    try {
      const { data } = await api.patch(`/goals/${goalId}/important`);
      const normalized = normalizeGoal(data);
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...normalized } : goal)));
      setImportantByGoal((prev) => ({ ...prev, [goalId]: Boolean(normalized.isImportant) }));
      emitGoalsUpdated();
    } catch (error) {
      console.error("Failed to toggle important goal:", error);
    }
  };

  const handleAddSubgoal = async ({ goalId, title, deadline }) => {
    if (!goalId || !title || !deadline) return false;

    if (isDemoMode) {
      const id = `${goalId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: [...(prev[goalId] || []), { id, title, deadline, completed: false }]
      }));
      return true;
    }

    try {
      const { data } = await api.post(`/goals/${goalId}/subgoals`, { title, deadline });
      const normalized = normalizeGoal(data);
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...normalized } : goal)));
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: Array.isArray(normalized.milestones) ? normalized.milestones : []
      }));
      emitGoalsUpdated();
      return true;
    } catch (error) {
      console.error("Failed to add subgoal:", error);
      throw error;
    }
  };

  const handleUpdateSubgoalStatus = async ({ goalId, subgoalId, completed }) => {
    if (!goalId || !subgoalId) return false;

    if (isDemoMode) {
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: (prev[goalId] || []).map((milestone) =>
          milestone.id === subgoalId ? { ...milestone, completed } : milestone
        )
      }));
      return true;
    }

    try {
      const { data } = await api.patch(`/goals/${goalId}/subgoals/${subgoalId}/progress`, { completed });
      const normalized = normalizeGoal(data);
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...normalized } : goal)));
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: Array.isArray(normalized.milestones) ? normalized.milestones : []
      }));
      emitGoalsUpdated();
      return true;
    } catch (error) {
      console.error("Failed to update subgoal progress:", error);
      throw error;
    }
  };

  const handleDeleteSubgoal = async ({ goalId, subgoalId }) => {
    if (!goalId || !subgoalId) return false;

    if (isDemoMode) {
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: (prev[goalId] || []).filter((milestone) => milestone.id !== subgoalId)
      }));
      return true;
    }

    try {
      const { data } = await api.delete(`/goals/${goalId}/subgoals/${subgoalId}`);
      const normalized = normalizeGoal(data);
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, ...normalized } : goal)));
      setMilestonesByGoal((prev) => ({
        ...prev,
        [goalId]: Array.isArray(normalized.milestones) ? normalized.milestones : []
      }));
      emitGoalsUpdated();
      return true;
    } catch (error) {
      console.error("Failed to delete subgoal:", error);
      throw error;
    }
  };

  const displayGoals = useMemo(() => {
    const baseGoals = isDemoMode ? GOALS.map(normalizeGoal) : goals;
    return baseGoals.filter((goal) => !(goal.deletedAt || goal.archiveReason === "deleted"));
  }, [goals, isDemoMode]);

  const renderContent = () => {
    if (activeTab === "create-goals") return <CreateGoal onGoalChanged={refreshGoals} />;
    if (activeTab === "progress")
      return (
        <Progress
          goals={displayGoals}
          importantByGoal={importantByGoal}
          milestonesByGoal={milestonesByGoal}
        />
      );
    return (
      <Mygoals
        goals={displayGoals}
        importantByGoal={importantByGoal}
        onToggleImportant={handleToggleImportant}
        milestonesByGoal={milestonesByGoal}
        setMilestonesByGoal={setMilestonesByGoal}
        onAddSubgoal={handleAddSubgoal}
        onUpdateSubgoalStatus={handleUpdateSubgoalStatus}
        onDeleteSubgoal={handleDeleteSubgoal}
      />
    );
  };

  return (
    <div className="w-full space-y-4">
      <div className="min-w-0 flex-1">
        <GoalNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <AnimatePresence mode="wait">
        <Motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {renderContent()}
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}
