import { useEffect, useState } from 'react';

/**
 * True from the first time `flag` is true onward, so a lazy screen mounts on
 * first use but keeps its exit animation afterwards.
 */
export function useEverTrue(flag) {
  const [ever, setEver] = useState(Boolean(flag));
  useEffect(() => { if (flag) setEver(true); }, [flag]);
  return ever || Boolean(flag);
}
