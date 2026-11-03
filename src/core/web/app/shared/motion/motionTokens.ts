export const motionDuration = {
  productiveShort: 0.07,
  productiveMedium: 0.1,
  productiveLong: 0.15,
  expressiveShort: 0.25,
  expressiveLong: 0.4,
} as const;

export const motionEase = {
  enter: [0, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
  state: [0.4, 0, 0.2, 1],
} as const;

export const motionTransition = {
  productive: {
    duration: motionDuration.productiveMedium,
    ease: motionEase.state,
  },
  inspector: {
    duration: motionDuration.productiveLong,
    ease: motionEase.enter,
  },
  navigation: {
    duration: motionDuration.expressiveShort,
    ease: motionEase.state,
  },
} as const;
