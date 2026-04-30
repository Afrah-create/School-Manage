export const authPageMotion = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

export const authPageTransition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

export const stateMotion = {
  enter: { y: 20, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};
