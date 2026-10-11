import { createContext, useContext } from "react";
export const JournalAnalysisContext = createContext(null);
export default function useJournalAnalysis() { return useContext(JournalAnalysisContext); }
