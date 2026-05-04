export const toBase64 = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(reader.result.split(",")[1]);
  reader.onerror = rej;
  reader.readAsDataURL(file);
});

export const readAsText = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(reader.result);
  reader.onerror = rej;
  reader.readAsText(file);
});

export const isPdf = (file) => file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
export const isImage = (file) => file?.type?.startsWith("image/") || file?.name?.match(/\.(jpg|jpeg|png|webp)$/i);
export const isText = (file) => file?.type === "text/plain" || file?.name?.toLowerCase().endsWith(".txt");
