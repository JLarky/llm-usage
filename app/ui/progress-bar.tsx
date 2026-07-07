import type { Handle } from "remix/ui";
import { css } from "remix/ui";

export function ProgressBar(handle: Handle<ProgressBarProps>) {
  return () => {
    const { usedPercent, conservativeTarget, aggressiveTarget } = handle.props;
    const fill = Math.min(100, usedPercent);
    const isOverage = conservativeTarget != null && usedPercent > conservativeTarget;
    const isDepleted = usedPercent >= 100;
    const barColor = isDepleted ? "#d14343" : isOverage ? "#c77700" : "#2dacf9";

    return (
      <div
        mix={css({
          position: "relative",
          height: "8px",
          width: "100%",
          minWidth: "100px",
          background: "var(--border)",
          borderRadius: "4px",
          overflow: "visible",
          marginTop: "4px",
        })}
      >
        <div
          mix={css({
            height: "100%",
            width: `${fill}%`,
            background: barColor,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          })}
        />
        {conservativeTarget != null && renderMarker(conservativeTarget, "#5c6166", "C")}
        {aggressiveTarget != null && renderMarker(aggressiveTarget, "#94989c", "A")}
      </div>
    );
  };
}

type ProgressBarProps = {
  usedPercent: number;
  conservativeTarget: number | null;
  aggressiveTarget: number | null;
};

function renderMarker(position: number, color: string, label: string) {
  const clamped = Math.max(1, Math.min(99, position));
  return (
    <div
      mix={css({
        position: "absolute",
        left: `calc(${clamped}% - 4px)`,
        top: "-3px",
        width: "8px",
        height: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      })}
      title={`${label}: ${Math.round(position)}%`}
    >
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
        <polygon points="0,0 8,0 4,8" fill={color} />
      </svg>
    </div>
  );
}
