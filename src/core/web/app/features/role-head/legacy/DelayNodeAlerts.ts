// Type declarations extracted from the web presentation module.

type DelayNode = {
    id: string;
    name: string;
    officer: string;
    slaHours: number;
    actualHours: number;
    backlog: number;
    burnoutFlag: boolean;
    onLeave: boolean;
    trendDelta: number;
};