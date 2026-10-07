import { useMemo, useState } from "react";

interface LineTrendChartProps<T> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color?: string;
  height?: number;
  compact?: boolean;
  labelFormatter?: (value: unknown) => string;
  valueFormatter?: (value: unknown) => string;
  yTickFormatter?: (value: unknown) => string;
}

const CHART_WIDTH = 600;
const AXIS_LEFT = 72;
const AXIS_RIGHT = 22;
const AXIS_TOP = 16;
const AXIS_BOTTOM = 34;

export function LineTrendChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = "#d26a45",
  height = 180,
  compact = false,
  labelFormatter,
  valueFormatter,
  yTickFormatter,
}: LineTrendChartProps<T>) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const plot = useMemo(() => {
    const values = data.map((item) => Number(item[yKey])).filter((value) => Number.isFinite(value));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const range = maxValue - minValue || Math.abs(maxValue) || 1;
    const paddedMin = minValue - range * 0.12;
    const paddedMax = maxValue + range * 0.12;
    const paddedRange = paddedMax - paddedMin || 1;
    const left = compact ? 6 : AXIS_LEFT;
    const right = compact ? 6 : AXIS_RIGHT;
    const top = compact ? 6 : AXIS_TOP;
    const bottom = compact ? 6 : AXIS_BOTTOM;
    const plotWidth = CHART_WIDTH - left - right;
    const plotHeight = height - top - bottom;
    const pointCount = Math.max(data.length - 1, 1);
    const points = data.map((item, index) => {
      const rawValue = Number(item[yKey]);
      const safeValue = Number.isFinite(rawValue) ? rawValue : paddedMin;
      const x = left + (plotWidth * index) / pointCount;
      const y = top + ((paddedMax - safeValue) / paddedRange) * plotHeight;
      return { x, y, value: rawValue, label: item[xKey] };
    });
    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = paddedMax - (paddedRange * index) / 4;
      return {
        value,
        y: top + (plotHeight * index) / 4,
      };
    });
    return { left, right, top, bottom, plotWidth, plotHeight, points, path, yTicks };
  }, [compact, data, height, yKey]);

  const hoverPoint = hoverIndex === null ? null : plot.points[hoverIndex];

  return (
    <div
      className={`line-trend-chart ${compact ? "line-trend-chart--compact" : ""}`}
      style={{ height }}
    >
      <svg
        className="line-trend-chart__svg"
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="趋势折线图"
      >
        {!compact ? (
          <g className="line-trend-chart__grid">
            {plot.yTicks.map((tick) => (
              <line
                key={tick.y}
                x1={plot.left}
                x2={CHART_WIDTH - plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#d9c9a5"
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ) : null}

        {!compact ? (
          <g className="line-trend-chart__ticks">
            {plot.yTicks.map((tick) => (
              <text
                key={`y-${tick.y}`}
                x={plot.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fill="#795b47"
                fontSize="12"
              >
                {yTickFormatter ? yTickFormatter(tick.value) : tick.value.toFixed(0)}
              </text>
            ))}
            {plot.points.map((point, index) => {
              if (plot.points.length > 8 && index % Math.ceil(plot.points.length / 6) !== 0 && index !== plot.points.length - 1) {
                return null;
              }
              return (
                <text
                  key={`x-${index}`}
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#795b47"
                  fontSize="12"
                >
                  {labelFormatter ? labelFormatter(point.label) : String(point.label)}
                </text>
              );
            })}
          </g>
        ) : null}

        <path
          className="line-trend-chart__line"
          d={plot.path}
          fill="none"
          stroke={color}
          strokeWidth={compact ? 2 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {!compact
          ? plot.points.map((point, index) => (
              <circle
                key={`dot-${index}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#fff8dc"
                stroke={color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
                tabIndex={0}
              />
            ))
          : null}

        {hoverPoint ? (
          <>
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={plot.top}
              y2={height - plot.bottom}
              stroke="#8c4f30"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" fill={color} stroke="#fff8dc" strokeWidth="2" />
          </>
        ) : null}
      </svg>

      {hoverPoint ? (
        <div
          className="line-trend-chart__tooltip"
          style={{
            left: `${(hoverPoint.x / CHART_WIDTH) * 100}%`,
            top: `${(hoverPoint.y / height) * 100}%`,
          }}
        >
          <strong>{labelFormatter ? labelFormatter(hoverPoint.label) : String(hoverPoint.label)}</strong>
          <span>{valueFormatter ? valueFormatter(hoverPoint.value) : String(hoverPoint.value)}</span>
        </div>
      ) : null}
    </div>
  );
}
