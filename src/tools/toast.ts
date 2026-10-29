let toastTimer: number | undefined;

export function toast(msg: string, isError = false) {
  const t = document.getElementById('toast')!;
  t.textContent = msg;
  t.classList.toggle('err', isError);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 1700);
}