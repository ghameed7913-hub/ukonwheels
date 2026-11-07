/* Compatibility for installed Driver binaries whose native bridge stages a
 * captured image before calling the existing secured upload function.
 * No storage or captured flags are set here: only confirmed uploads do that.
 */
window.UKOWPhotoAutosave = (() => {
  const attempted = new WeakMap();
  let scheduled = false;

  function scan() {
    if (!window.__ukowNativeEvidenceInstalled ||
        typeof role === "undefined" || role !== "driver") return;
    document.querySelectorAll(".cameraBox").forEach(box => {
      const status = box.querySelector(".captureMeta");
      const button = box.querySelector(".camActions .primary");
      if (!status || !button) return;
      const image = box.querySelector(".nativeCameraPreview");
      const failed = status.classList.contains("error");
      // Native camera supplies the shutter; this button is only a retry.
      const hidden = !failed;
      if (button.hidden !== hidden) button.hidden = hidden;
      if (button.textContent !== "Retry save") button.textContent = "Retry save";
      if (!image || !image.src || failed || button.disabled ||
          status.dataset.nativeBusy === "1" ||
          !/^Photo ready\b/.test(status.textContent || "")) return;
      if (attempted.get(image) === image.src) return;
      // One automatic attempt per freshly captured photo, never a retry loop.
      attempted.set(image, image.src);
      button.click();
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; scan(); });
  }

  function start() {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["src", "class", "disabled", "data-native-busy"],
    });
    scan();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
  return {scan};
})();
