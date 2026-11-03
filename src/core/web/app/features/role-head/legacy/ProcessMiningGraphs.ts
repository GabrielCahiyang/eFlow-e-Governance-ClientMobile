// Type declarations extracted from the web presentation module.

type FlowNode = {
    id: string;
    label: string;
    x: number;
    y: number;
    slaHours: number;
    actualHours: number;
    inQueue: number;
    officer?: string;
};
type FlowEdge = {
    from: string;
    to: string;
};