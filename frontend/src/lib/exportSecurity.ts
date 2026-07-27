export const EXPORT_PASSWORD_MIN_LENGTH = 12;

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%*-_";
const ALL_CHARACTERS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SYMBOLS}`;

const secureRandomIndex = (max: number): number => {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % max;
};

export const generateExportPassword = (length = 16): string => {
  const safeLength = Math.max(length, EXPORT_PASSWORD_MIN_LENGTH);
  const password = [
    UPPERCASE[secureRandomIndex(UPPERCASE.length)],
    LOWERCASE[secureRandomIndex(LOWERCASE.length)],
    NUMBERS[secureRandomIndex(NUMBERS.length)],
    SYMBOLS[secureRandomIndex(SYMBOLS.length)],
  ];

  while (password.length < safeLength) {
    password.push(ALL_CHARACTERS[secureRandomIndex(ALL_CHARACTERS.length)]);
  }

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
};

export const getDownloadFileName = (
  contentDisposition: unknown,
  fallback: string,
): string => {
  if (typeof contentDisposition !== "string") {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].trim());
  }

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1]?.trim() || fallback;
};
