import { createContext, useContext } from "react";
export const GoalAnalysisContext = createContext(null);
export default function useGoalAnalysis() { return useContext(GoalAnalysisContext); }

