type OrderFilter = {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};

type OrderShift = {
  columnId: string;
  order: OrderFilter;
  direction: "increment" | "decrement";
};

/** Returns the bulk order shifts needed to make room for a moved card. */
export function calculateOrderShifts({
  sourceColumnId,
  targetColumnId,
  sourceOrder,
  targetOrder,
}: {
  sourceColumnId: string;
  targetColumnId: string;
  sourceOrder: number;
  targetOrder: number;
}): { source?: OrderShift; target?: OrderShift } {
  if (sourceColumnId === targetColumnId) {
    if (sourceOrder === targetOrder) return {};

    return sourceOrder < targetOrder
      ? {
          source: {
            columnId: sourceColumnId,
            order: { gt: sourceOrder, lte: targetOrder },
            direction: "decrement",
          },
        }
      : {
          source: {
            columnId: sourceColumnId,
            order: { gte: targetOrder, lt: sourceOrder },
            direction: "increment",
          },
        };
  }

  return {
    source: {
      columnId: sourceColumnId,
      order: { gt: sourceOrder },
      direction: "decrement",
    },
    target: {
      columnId: targetColumnId,
      order: { gte: targetOrder },
      direction: "increment",
    },
  };
}
