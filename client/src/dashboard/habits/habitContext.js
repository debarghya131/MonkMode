import { createContext, useContext } from "react";

export const HabitContext = createContext(null);
export const useHabitEnvironment = () => useContext(HabitContext);
