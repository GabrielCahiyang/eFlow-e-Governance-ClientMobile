// Type declarations extracted from the web presentation module.
import type {ReactNode} from "react";
type SessionMessage = {
    type: "activity";
    at: number;
} | {
    type: "logout";
    at: number;
};