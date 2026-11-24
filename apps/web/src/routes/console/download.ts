// Hand the browser a file the API answered, under the name the API gave it (#128's, kept): a blob URL,
// so nothing leaves the page. The users export and the Audit Log's export share the CSV one; a Workspace's
// intake PDF (D-241) the blob one.
export function downloadCsv(csv: string, filename: string): void {
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
