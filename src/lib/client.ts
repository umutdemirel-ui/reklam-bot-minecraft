export function exportFile(name: string, text: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
export async function api(url: string, body?: object, signal?: AbortSignal) {
  const response = await fetch(url, {
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Servise ulaşılamadı. Tekrar deneyin.');
  return data;
}
