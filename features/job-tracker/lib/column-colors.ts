import type {
  BoardColumn,
  ColumnColor,
} from "@/features/job-tracker/schemas/job-tracker";

/** Static Tailwind classes per preset color — do NOT build these dynamically
 *  (Tailwind v4 only keeps literal class strings). `bar` = column accent bar,
 *  `dot` = small indicator next to the column name, `swatch` = picker circle. */
export const COLUMN_COLORS: Record<
  ColumnColor,
  { bar: string; dot: string; swatch: string }
> = {
  blue: { bar: "bg-blue-500", dot: "bg-blue-500", swatch: "bg-blue-500" },
  green: { bar: "bg-green-500", dot: "bg-green-500", swatch: "bg-green-500" },
  yellow: {
    bar: "bg-yellow-500",
    dot: "bg-yellow-500",
    swatch: "bg-yellow-500",
  },
  purple: {
    bar: "bg-purple-500",
    dot: "bg-purple-500",
    swatch: "bg-purple-500",
  },
  red: { bar: "bg-red-500", dot: "bg-red-500", swatch: "bg-red-500" },
  orange: {
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    swatch: "bg-orange-500",
  },
  pink: { bar: "bg-pink-500", dot: "bg-pink-500", swatch: "bg-pink-500" },
  gray: { bar: "bg-gray-400", dot: "bg-gray-400", swatch: "bg-gray-400" },
};

export const COLUMN_COLOR_NAMES = Object.keys(COLUMN_COLORS) as ColumnColor[];

/** Indonesian labels for the picker's aria-labels. */
export const COLUMN_COLOR_LABELS: Record<ColumnColor, string> = {
  blue: "Biru",
  green: "Hijau",
  yellow: "Kuning",
  purple: "Ungu",
  red: "Merah",
  orange: "Oranye",
  pink: "Merah muda",
  gray: "Abu-abu",
};

const KIND_DEFAULTS: Record<string, ColumnColor> = {
  applied: "blue",
  interview: "yellow",
  offer: "purple",
  accepted: "green",
  rejected: "red",
  custom: "gray",
};

/** Effective color: stored value, else default by kind, else gray. */
export function getColumnColor(
  column: Pick<BoardColumn, "color" | "kind">,
): ColumnColor {
  return column.color ?? KIND_DEFAULTS[column.kind] ?? "gray";
}
