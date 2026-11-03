import type { Transition, Variants } from "motion/react";

/**
 * Named rotation speed constants (deg/sec) adhering to eFlow mark specifications.
 */
export const IDLE_ROTATION_SPEED = 18;
export const HOVER_ROTATION_SPEED = 90;
export const SUBMIT_ROTATION_SPEED = 540;

/**
 * Named spring and easing tokens adhering to eFlow / Vibe motion guidelines.
 */
export const SPRING_ENTER: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

export const SPRING_SNAP: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 32,
};

export const SPRING_DRIFT: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 30,
};

export const EASE_EXPO: Transition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Left Panel form entrance variants.
 * Staggers children into view smoothly without blocking interaction.
 */
export const formContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

export const formItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: SPRING_ENTER,
  },
};

/**
 * Right Panel hero entrance variants.
 */
export const heroPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 40,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: SPRING_ENTER,
  },
};

/**
 * Word-by-word headline reveal variants.
 */
export const headlineContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
    },
  },
};

export const headlineWordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    rotateX: -40,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: SPRING_ENTER,
  },
};

/**
 * Field-level shake animation on validation error.
 */
export const fieldErrorShakeVariants: Variants = {
  idle: { x: 0 },
  error: {
    x: [0, -6, 5, -3, 0],
    transition: { duration: 0.32, ease: "easeInOut" },
  },
};

/**
 * Inline error/banner collapse-expand variants.
 */
export const alertBannerVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    overflow: "hidden",
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  visible: {
    opacity: 1,
    height: "auto",
    marginTop: 8,
    marginBottom: 8,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    overflow: "hidden",
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};
