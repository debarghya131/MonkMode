import { useEffect, useState } from "react";

const MOBILE_LOW_MOTION_QUERY = "(max-width: 1023px), (hover: none), (prefers-reduced-motion: reduce)";

export default function useMobileLowMotion() {
  const [lowMotion, setLowMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_LOW_MOTION_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_LOW_MOTION_QUERY);
    const update = () => setLowMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return lowMotion;
}
