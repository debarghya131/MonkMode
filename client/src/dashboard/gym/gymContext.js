import { createContext, useContext } from "react";

export const GymContext = createContext(null);
export const useGymEnvironment = () => useContext(GymContext);
