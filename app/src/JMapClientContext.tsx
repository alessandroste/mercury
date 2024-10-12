import { createContext } from "react";
import JMapClient from "./services/JMapClient";

export const JMapClientContext = createContext<JMapClient | undefined>(undefined)