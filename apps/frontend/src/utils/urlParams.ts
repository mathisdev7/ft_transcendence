export function getHashParams(): URLSearchParams {
  const hash = window.location.hash;

  if (hash.includes("?")) {
    const queryString = hash.split("?")[1];
    return new URLSearchParams(queryString);
  }

  return new URLSearchParams();
}

export function getHashParam(key: string): string | null {
  return getHashParams().get(key);
}

export function waitForHashParam(
  key: string,
  maxAttempts: number = 10,
  delay: number = 100
): Promise<string | null> {
  return new Promise((resolve) => {
    let attempts = 0;

    const checkParam = () => {
      const value = getHashParam(key);

      if (value || attempts >= maxAttempts) {
        resolve(value);
        return;
      }

      attempts++;
      setTimeout(checkParam, delay);
    };

    checkParam();
  });
}
