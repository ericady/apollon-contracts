export const constructFromUnixTimestamp = (timestamp: number) => {
  const now = new Date();
  const date = new Date(timestamp);
  const daysFromToday = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // Use padStart() to add leading zeros to single-digit numbers
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return { day, month, year, hours, minutes, daysFromToday };
};

export const formatUnixTimestamp = (timestamp: number) => {
  const { day, daysFromToday, hours, minutes, month, year } = constructFromUnixTimestamp(timestamp);

  return `${day}.${month}.${year} ${hours}:${minutes} (-${daysFromToday}d)`;
};
