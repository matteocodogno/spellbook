import { useState, useEffect, useRef } from "react";

interface NoteBoxProps {
  stepKey: string;
  color: string;
  notes: Record<string, string>;
  setNote: (key: string, value: string) => void;
}

export function NoteBox({ stepKey, color, notes, setNote }: NoteBoxProps) {
  const val = notes[stepKey] ?? "";
  // Auto-open if a note already exists when the component first mounts
  const [open, setOpen] = useState(() => Boolean(val));
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = taRef.current.scrollHeight + "px";
    }
  }, [open, val]);

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 0", fontFamily: "inherit",
          color: open || val ? color : "#555E6D",
          fontSize: 11, letterSpacing: 0.5,
          transition: "color 0.15s",
        }}
      >
        <span style={{ fontSize: 12 }}>{open ? "▾" : "▸"}</span>
        {val && !open
          ? <span style={{ fontStyle: "italic", opacity: 0.7, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val.split("\n")[0]}</span>
          : <span>✎ my note</span>
        }
      </button>
      {open && (
        <textarea
          ref={taRef}
          value={val}
          placeholder={"Jot your token, project name, what you changed…\nThis note is saved to your browser storage."}
          onChange={e => {
            setNote(stepKey, e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          style={{
            display: "block",
            width: "100%",
            minHeight: 72,
            marginTop: 6,
            padding: "10px 12px",
            background: "rgba(255,209,102,0.04)",
            border: `1px solid ${color}30`,
            borderRadius: 6,
            color: "#CDD6F4",
            fontSize: 12,
            fontFamily: "inherit",
            lineHeight: 1.6,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
            overflowY: "hidden",
          }}
          onFocus={e => { e.target.style.borderColor = color + "70"; }}
          onBlur={e => { e.target.style.borderColor = color + "30"; }}
        />
      )}
    </div>
  );
}
