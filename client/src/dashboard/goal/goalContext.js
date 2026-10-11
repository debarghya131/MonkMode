import { createContext, useContext } from "react";

export const GoalContext = createContext(null);
export const useGoalContext = () => useContext(GoalContext);
