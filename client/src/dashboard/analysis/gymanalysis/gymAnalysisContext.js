import { createContext, useContext } from "react";
export const GymAnalysisContext = createContext(null);
export default function useGymAnalysis() { return useContext(GymAnalysisContext); }

