// Native equivalents of EflowWeb motionTokens.ts and pages/Login/motion.ts.
export const motionDuration = {
  productiveShort: 70,
  productiveMedium: 100,
  productiveLong: 150,
  expressiveShort: 250,
  expressiveLong: 400,
} as const;
export const motionEase = {
  enter: [0, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
  state: [0.4, 0, 0.2, 1],
  expo: [0.16, 1, 0.3, 1],
} as const;
export const loginMotion = {
  idleSpeed: 18,
  hoverSpeed: 90,
  submittingSpeed: 540,
  mountSpin: 900,
  stagger: 70,
  delay: 100,
  enter: { stiffness: 260, damping: 26, mass: 0.9 },
  drift: { stiffness: 280, damping: 30 },
  snap: { stiffness: 500, damping: 32 },
  speed: { stiffness: 140, damping: 24, mass: 0.8 },
  success: { stiffness: 180, damping: 26 },
  error: { stiffness: 450, damping: 18 },
} as const;
export const loadingMotion = {
  pulse: 1600,
  pulseMinimum: 0.45,
  sweep: 1600,
  enter: 300,
} as const;
