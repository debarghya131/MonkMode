export function showDashboardToast(message, tone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("monkmode:toast", {
    detail: { message, tone },
  }));
}
