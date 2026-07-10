import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useOzoQuery — stable, visibility-aware data fetching hook for Ozo pages.
 *
 * Fixes:
 * 1. Zustand fn refs: store functions go into a ref so they never re-trigger
 *    the effect. Only real primitive dep changes cause a re-fetch.
 * 2. Page Visibility: when the user returns from background (tab switch,
 *    mobile app switch), if data is missing we automatically re-fetch so the
 *    page is never left blank.
 * 3. AbortController / Cleanup: aborts in-flight requests on dependency changes
 *    or unmounts to prevent memory leaks and race conditions.
 */
export const useOzoQuery = (fetchFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // start true → skeleton shows immediately
  const [isError, setIsError] = useState(false);

  // Ref to track the current in-flight AbortController
  const abortControllerRef = useRef(null);

  // Refs to always call the latest version without re-triggering effects
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => { fetchFnRef.current = fetchFn; });

  // Refs to read current state inside event listeners without stale closures
  const dataRef = useRef(data);
  const isLoadingRef = useRef(isLoading);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Stringify primitive deps — functions replaced with '__fn__' so Zustand
  // function reference changes do NOT cause spurious re-fetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = JSON.stringify(
    dependencies.map(d => (typeof d === 'function' ? '__fn__' : d))
  );

  const lastDepsKeyRef = useRef(null);

  const executeFetch = useCallback(async () => {
    // Cancel the previous active request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const isDepChange = lastDepsKeyRef.current !== depsKey;
    if (isDepChange) {
      setData(null);
      lastDepsKeyRef.current = depsKey;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      // Pass the controller's signal to the fetch function
      const result = await fetchFnRef.current(controller.signal);
      
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        // Fetch aborted, no action needed
      } else {
        if (!controller.signal.aborted) {
          console.error('[useOzoQuery] Fetch error:', err);
          setIsError(true);
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  // depsKey encodes when a real refetch is needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  // Primary fetch effect — runs when deps change (e.g. slug changes)
  useEffect(() => {
    executeFetch();
    
    // Cleanup: abort any in-flight fetches on unmount or deps change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeFetch]);

  // Page Visibility API — refetch if data is missing when user returns
  // from background (tab switch, mobile app switch, screen lock, etc.)
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        dataRef.current === null &&
        !isLoadingRef.current
      ) {
        executeFetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [executeFetch]);

  return { data, isLoading, isError, refetch: executeFetch };
};

export default useOzoQuery;

