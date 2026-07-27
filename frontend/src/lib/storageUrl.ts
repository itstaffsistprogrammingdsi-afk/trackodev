const getBackendUrl = () => {
  const apiBase = import.meta.env.VITE_API_URL || "/api";
  const backendUrl = new URL(apiBase, window.location.origin);

  backendUrl.search = "";
  backendUrl.hash = "";
  backendUrl.pathname = backendUrl.pathname.replace(/\/api\/?$/, "");

  return backendUrl;
};

export const resolveStorageUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return "";

  if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const backendUrl = getBackendUrl();
  const cleanPath = pathOrUrl
    .replace(/^\/+/, "")
    .replace(/^storage\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${backendUrl.toString().replace(/\/$/, "")}/storage/${cleanPath}`;
};