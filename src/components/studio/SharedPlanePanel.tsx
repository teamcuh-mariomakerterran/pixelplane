import { useEffect, useState } from "react";
import { useCollab } from "@/store/collab";
import { useP2PRoom } from "@/lib/multiplayer";
import { OVERLAY_ANIM_OPTIONS } from "@/lib/ui/overlay-anim";
import { Users, X, Copy, Send, GitBranch, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Host mounts only when collab.enabled — keys room+name so remount rejoins.
 */
export function SharedPlaneHost() {
  const enabled = useCollab((s) => s.enabled);
  const roomCode = useCollab((s) => s.roomCode);
  const displayName = useCollab((s) => s.displayName);
  if (!enabled) return null;
  return <SharedPlaneSession key={`${roomCode}:${displayName}`} room={roomCode} name={displayName} />;
}

function SharedPlaneSession({ room, name }: { room: string; name: string }) {
  const p2p = useP2PRoom({ room, name });
  const setTransport = useCollab((s) => s.setTransport);
  const handleMessage = useCollab((s) => s.handleMessage);
  const removePresence = useCollab((s) => s.removePresence);
  const presence = useCollab((s) => s.presence);

  useEffect(() => {
    setTransport({
      selfId: p2p.selfId,
      joined: p2p.joined,
      peers: p2p.peers,
      send: p2p.send,
      broadcast: p2p.broadcast,
    });
  }, [p2p.selfId, p2p.joined, p2p.peers, p2p.send, p2p.broadcast, setTransport]);

  useEffect(() => {
    return p2p.onMessage((from, data, channel) => handleMessage(from, data, channel));
  }, [p2p.onMessage, handleMessage]);

  // drop presence for gone peers
  useEffect(() => {
    const ids = new Set(p2p.peers.map((p) => p.id));
    for (const id of Object.keys(presence)) {
      if (!ids.has(id)) removePresence(id);
    }
  }, [p2p.peers, presence, removePresence]);

  useEffect(() => {
    return () => setTransport(null);
  }, [setTransport]);

  return null;
}

export function SharedPlanePanel() {
  const show = useCollab((s) => s.showPanel);
  const setShow = useCollab((s) => s.setShowPanel);
  const enabled = useCollab((s) => s.enabled);
  const setEnabled = useCollab((s) => s.setEnabled);
  const roomCode = useCollab((s) => s.roomCode);
  const setRoomCode = useCollab((s) => s.setRoomCode);
  const newRoomCode = useCollab((s) => s.newRoomCode);
  const displayName = useCollab((s) => s.displayName);
  const setDisplayName = useCollab((s) => s.setDisplayName);
  const status = useCollab((s) => s.status);
  const peers = useCollab((s) => s.peers);
  const joined = useCollab((s) => s.joined);
  const overlayAnim = useCollab((s) => s.overlayAnim);
  const setOverlayAnim = useCollab((s) => s.setOverlayAnim);
  const customAnimCss = useCollab((s) => s.customAnimCss);
  const setCustomAnimCss = useCollab((s) => s.setCustomAnimCss);
  const sendPlaneMessage = useCollab((s) => s.sendPlaneMessage);
  const shareActiveLayerBranch = useCollab((s) => s.shareActiveLayerBranch);
  const sendSocialPing = useCollab((s) => s.sendSocialPing);
  const [msg, setMsg] = useState("");
  const [draftRoom, setDraftRoom] = useState(roomCode);

  useEffect(() => setDraftRoom(roomCode), [roomCode]);

  if (!show) return null;

  return (
    <div className="absolute bottom-28 left-2 z-30 w-[min(320px,calc(100vw-16px))] overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-elevated/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Users size={14} className="text-accent" />
        <span className="text-xs font-semibold text-fg">Shared plane</span>
        <button type="button" className="ml-auto text-muted hover:text-fg" onClick={() => setShow(false)}>
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto px-3 py-3 text-[11px]">
        <p className="leading-snug text-muted">
          Create together — art teams, friends, or family across cities. Same infinite plane, live
          cursors, canvas messages, layer branches. Co-op only (peer-to-peer).
        </p>

        <label className="block text-subtle">
          Your name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
            className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 text-fg"
          />
        </label>

        <label className="block text-subtle">
          Room code
          <div className="mt-0.5 flex gap-1">
            <input
              value={draftRoom}
              onChange={(e) => setDraftRoom(e.target.value.replace(/\s/g, "").slice(0, 64))}
              className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-mono text-fg"
            />
            <button
              type="button"
              title="Copy"
              className="rounded border border-border px-2 text-muted hover:text-fg"
              onClick={() => void navigator.clipboard?.writeText(draftRoom)}
            >
              <Copy size={12} />
            </button>
          </div>
        </label>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-muted hover:text-fg"
            onClick={() => {
              newRoomCode();
              setDraftRoom(useCollab.getState().roomCode);
            }}
          >
            New code
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-muted hover:text-fg"
            onClick={() => setRoomCode(draftRoom)}
          >
            Use code
          </button>
        </div>

        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] py-2 text-xs font-semibold",
            enabled ? "bg-danger/20 text-danger" : "bg-accent text-accent-fg",
          )}
          onClick={() => {
            setRoomCode(draftRoom);
            setEnabled(!enabled);
          }}
        >
          <Users size={14} />
          {enabled ? "Leave plane" : "Join shared plane"}
        </button>

        <p className="font-mono text-[10px] text-subtle">
          {status}
          {joined ? ` · peers ${peers.length}` : ""}
        </p>

        {peers.length > 0 && (
          <ul className="space-y-0.5">
            {peers.map((p) => (
              <li key={p.id} className="flex justify-between text-[10px] text-muted">
                <span>{p.name || p.id}</span>
                <span className="font-mono text-subtle">
                  {p.connectionState}
                  {p.rttMs != null ? ` · ${Math.round(p.rttMs)}ms` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border pt-2">
          <div className="mb-1 font-semibold text-fg">Canvas message</div>
          <div className="flex gap-1">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Hey — look at this corner…"
              className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-fg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && msg.trim()) {
                  sendPlaneMessage("Message", msg.trim());
                  setMsg("");
                }
              }}
            />
            <button
              type="button"
              className="rounded bg-accent px-2 text-accent-fg"
              onClick={() => {
                if (!msg.trim()) return;
                sendPlaneMessage("Message", msg.trim());
                setMsg("");
              }}
            >
              <Send size={12} />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
              onClick={() => shareActiveLayerBranch()}
            >
              <GitBranch size={10} /> Share layer branch
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
              onClick={() => sendSocialPing("👋")}
            >
              <Hand size={10} /> Wave
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <div className="mb-1 font-semibold text-fg">Popup entrance</div>
          <p className="mb-1 text-[10px] text-subtle">
            How tips, messages, and collab notes animate into your view.
          </p>
          <div className="flex flex-wrap gap-1">
            {OVERLAY_ANIM_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOverlayAnim(o.id)}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px]",
                  overlayAnim === o.id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {overlayAnim === "custom" && (
            <input
              value={customAnimCss}
              onChange={(e) => setCustomAnimCss(e.target.value)}
              placeholder="myAnim 0.4s ease-out"
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 font-mono text-[10px] text-fg"
            />
          )}
        </div>
      </div>
    </div>
  );
}
