import type { Handle } from "remix/ui";
import { css } from "remix/ui";

export function UsageBar(handle: Handle<UsageBarProps>) {
  return () => {
    const { usedPercent, target, targetLabel, barColor } = handle.props;
    const fill = Math.min(100, usedPercent);

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
            background: barColor ?? "#2dacf9",
            borderRadius: "4px",
            transition: "width 0.3s ease",
          })}
        />
        {target != null && renderMarker(target, barColor ?? "#2dacf9", targetLabel)}
      </div>
    );
  };
}

type UsageBarProps = {
  usedPercent: number;
  target: number | null;
  targetLabel: string;
  barColor?: string;
};

export function TimeBar(handle: Handle<TimeBarProps>) {
  return () => {
    const { elapsedPercent, label } = handle.props;
    const fill = Math.min(100, Math.max(0, elapsedPercent));

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
            background: "var(--text-tertiary)",
            borderRadius: "4px",
            opacity: "0.5",
            transition: "width 0.3s ease",
          })}
        />
        <span
          mix={css({
            position: "absolute",
            right: "4px",
            top: "-1px",
            fontSize: "9px",
            color: "var(--text-tertiary)",
            lineHeight: "10px",
          })}
        >
          {label}
        </span>
      </div>
    );
  };
}

type TimeBarProps = {
  elapsedPercent: number;
  label: string;
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
