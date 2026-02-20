import { useEffect, useRef, useState } from "react";

interface HealEffectProps {
  accumulatedDamage: number;
  isAlive: boolean;
}

const PARTICLE_POSITIONS = [15, 30, 50, 68, 82]; // % from left

function HealEffect({ accumulatedDamage, isAlive }: HealEffectProps) {
  const [visible, setVisible] = useState(false);
  const prevDamageRef = useRef(accumulatedDamage);

  useEffect(() => {
    const prev = prevDamageRef.current;
    prevDamageRef.current = accumulatedDamage;

    // Trigger only when damage decreases (heal fired) and player is alive
    if (isAlive && accumulatedDamage < prev && prev > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [accumulatedDamage, isAlive]);

  if (!visible) return null;

  return (
    <div
      className="heal-flash absolute inset-0 pointer-events-none z-10 overflow-hidden"
      data-testid="heal-effect"
    >
      {PARTICLE_POSITIONS.map((left, i) => (
        <div
          key={i}
          className="heal-particle"
          style={{ left: `${left}%`, bottom: "35%" }}
        >
          +
        </div>
      ))}
    </div>
  );
}

export default HealEffect;
