import { createContext, useContext } from "react";

export const TodoAnalysisContext = createContext(null);
export default function useTodoAnalysis() {
  return useContext(TodoAnalysisContext);
}

