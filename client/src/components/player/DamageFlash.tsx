import { useEffect, useRef, useState } from "react";
import { DAMAGE_FLASH_CONFIG } from "@/utils/constants";

interface DamageFlashProps {
  accumulatedDamage: number;
}

const FLASH_DURATION_MS = DAMAGE_FLASH_CONFIG.DURATION_MS;

function DamageFlash({ accumulatedDamage }: DamageFlashProps) {
  const [flashing, setFlashing] = useState(false);
  const prevDamageRef = useRef(accumulatedDamage);

  useEffect(() => {
    const prevDamage = prevDamageRef.current;
    prevDamageRef.current = accumulatedDamage;

    // Only flash when damage increases (not on reset/decrease)
    if (accumulatedDamage > prevDamage) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), FLASH_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [accumulatedDamage]);

  if (!flashing) return null;

  return (
    <div
      className="damage-flash absolute inset-0 pointer-events-none z-10"
      data-testid="damage-flash"
    />
  );
}

export default DamageFlash;
