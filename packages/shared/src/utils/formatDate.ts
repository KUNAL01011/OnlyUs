export function formatDate(
  input: string | number | Date,
  locale = "en-US"
): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(input)
  );
}

export function formatTime(
  input: string | number | Date,
  locale = "en-US"
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}
