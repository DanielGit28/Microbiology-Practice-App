import { useState, useEffect } from "react";

export function useCountdown(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [running, seconds]);

  function start() {
    setRunning(true);
  }
  function stop() {
    setRunning(false);
  }
  function reset(s) {
    setSeconds(s);
    setRunning(false);
  }

  return { seconds, running, start, stop, reset };
}
