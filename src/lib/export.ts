import { toPng } from "html-to-image";
export async function exportReport(node: HTMLElement, name: string) {
  await document.fonts.ready;
  // Export a compact dedicated report, so very long READMEs cannot exhaust canvas memory.
  const url = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim(),
    cacheBust: true,
    filter: (element) =>
      !(element instanceof HTMLElement && element.dataset.noExport === "true"),
  });
  const anchor = document.createElement("a");
  anchor.download = `RepoLens-${name.replace(/\//g, "-")}.png`;
  anchor.href = url;
  anchor.click();
}
