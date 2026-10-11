import { createContext, useContext } from "react";

export const HabitAnalysisContext = createContext(null);
export default function useHabitAnalysis() {
  return useContext(HabitAnalysisContext);
}

