export const isImage = (str: string) =>
  /\.(jpg|jpeg|png|webp|gif)$/i.test(str);

export const isVideo = (str: string) =>
  /\.(mp4|webm|ogg)$/i.test(str);

export const isFile = (str: string) =>
  /\.(pdf|doc|docx|xls|xlsx|zip)$/i.test(str);

export const isUrl = (str: string) =>
  str.startsWith("http");