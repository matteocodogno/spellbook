import { useState, useCallback } from "react";

interface CodeBlockProps {
  code: string;
  // color is accepted for API consistency but not yet used in this component's styles
  color?: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      navigator.clipboard?.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [code]);

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <pre style={{
        margin: 0,
        padding: "14px 16px",
        paddingRight: 80,
        background: "#0D1117",
        borderRadius: 8,
        fontSize: 11,
        color: "#A8FF78",
        overflowX: "auto",
        lineHeight: 1.7,
        border: "1px solid rgba(168,255,120,0.1)",
      }}>{code}</pre>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          background: copied ? "rgba(100,255,218,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${copied ? "rgba(100,255,218,0.4)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 6,
          color: copied ? "#64FFDA" : "#8B949E",
          fontSize: 10,
          fontFamily: "inherit",
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "✓ copied" : "⎘ copy"}
      </button>
    </div>
  );
}
