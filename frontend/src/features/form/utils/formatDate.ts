export const formatDate = (date: string) =>
  new Date(date).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });