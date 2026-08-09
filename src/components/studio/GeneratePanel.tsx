import { useState, useRef } from "react";
import { X, Wand2, Upload, Loader2 } from "lucide-react";
import { useStudio } from "@/store/studio";
import { pixelateImage, imageDataToBuffer } from "@/lib/pixel/buffer";
import { removeBackground } from "@/lib/pixel/bg-remove";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "8bit" as const, label: "8-bit / NES", desc: "Chunky low-res" },
  { id: "16bit" as const, label: "16-bit / SNES", desc: "Rich palette" },
  { id: "hd-pixel" as const, label: "HD pixel", desc: "Crisp modern" },
  { id: "iso" as const, label: "Isometric", desc: "¾ view vibe" },
  { id: "silhouette" as const, label: "Silhouette", desc: "Dark outline" },
  { id: "cartoon" as const, label: "Cartoon", desc: "Bold shapes" },
];

const ANIMS = [
  { id: "none" as const, label: "Still" },
  { id: "idle" as const, label: "Idle" },
  { id: "walk" as const, label: "Walk" },
  { id: "run" as const, label: "Run" },
  { id: "attack" as const, label: "Attack" },
  { id: "jump" as const, label: "Jump" },
];

export function GeneratePanel() {
  const show = useStudio((s) => s.showGenerate);
  const setShow = useStudio((s) => s.setShowGenerate);
  const generateFromPrompt = useStudio((s) => s.generateFromPrompt);
  const importImageToArtboard = useStudio((s) => s.importImageToArtboard);
  const mode = useStudio((s) => s.meta.pixelMode);

  const [prompt, setPrompt] = useState(
    "Cyberpunk pixel-art rat character, dark navy fur, cyan eyes, magenta ears and tail, black hooded jacket with cyan trim, katana",
  );
  const [style, setStyle] = useState<(typeof STYLES)[number]["id"]>("16bit");
  const [anim, setAnim] = useState<(typeof ANIMS)[number]["id"]>("idle");
  const [size, setSize] = useState(48);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const run = () => {
    setBusy(true);
    // yield so spinner paints
    setTimeout(() => {
      generateFromPrompt({ prompt, style, anim, size });
      setBusy(false);
    }, 40);
  };

  const onRef = async (file: File) => {
    setBusy(true);
    try {
      const bmp = await createImageBitmap(file);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const tw = size;
      const th = size;
      let data = pixelateImage(id, tw, th, mode);
      data = removeBackground(data, tw, th, { tolerance: 40 });
      importImageToArtboard(data, tw, th, file.name.replace(/\.\w+$/, "") + " (pixel)");
      setShow(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Wand2 size={16} className="text-accent" />
              Create Character
            </div>
            <p className="text-[11px] text-muted">
              Prompt + style → crisp pixel sheet & live animation on the plane
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        {/* steps */}
        <div className="flex gap-2 border-b border-border px-4 py-2 text-[11px]">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition",
                step === n ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {n}. {n === 1 ? "Describe" : n === 2 ? "Style" : "Generate"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-muted">
                Prompt
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="mt-1 w-full resize-none rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                  placeholder="Describe your character…"
                />
              </label>
              <div>
                <div className="mb-1 text-xs font-medium text-muted">Or reference image</div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface py-6 text-sm text-muted transition hover:border-accent hover:text-fg"
                >
                  <Upload size={16} />
                  Pixelate + remove BG from image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onRef(f);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium text-muted">Art style</div>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle(s.id)}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition",
                        style === s.id
                          ? "border-accent bg-accent/15 text-fg"
                          : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
                      )}
                    >
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="text-[10px] opacity-70">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-muted">Animation</div>
                <div className="flex flex-wrap gap-1.5">
                  {ANIMS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAnim(a.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        anim === a.id
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-muted hover:text-fg",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted">Frame size · {size}px</div>
                <input
                  type="range"
                  min={24}
                  max={64}
                  step={8}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 text-xs text-muted hover:text-fg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
                <div className="mb-1 font-semibold text-fg">Ready to generate</div>
                <p>
                  <span className="text-subtle">Prompt:</span> {prompt.slice(0, 160)}
                  {prompt.length > 160 ? "…" : ""}
                </p>
                <p className="mt-1">
                  <span className="text-subtle">Style:</span> {style} ·{" "}
                  <span className="text-subtle">Anim:</span> {anim} ·{" "}
                  <span className="text-subtle">Size:</span> {size}px
                </p>
                <p className="mt-2 text-[11px] text-subtle">
                  Creates a spritesheet artboard plus a live animation region on the workspace.
                  Crisp integer pixels — no blur.
                </p>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 text-xs text-muted hover:text-fg"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy || !prompt.trim()}
                  onClick={run}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-5 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  Generate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

void imageDataToBuffer;
