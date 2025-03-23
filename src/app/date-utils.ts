export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function splitMessage(text: string): string[] {
  const regex = /(@[\w\-_!$*]+)/g;
  const parts = text.split(regex);
  const cleanedParts = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return cleanedParts;
}

export function displayDayInfo(messages: any, index: number): boolean {
  if (index === 0) return true;
  const currentMessage = messages[index];
  const previousMessage = messages[index - 1];
  return !isSameDay(
    new Date(currentMessage.timestamp),
    new Date(previousMessage.timestamp)
  );
}
