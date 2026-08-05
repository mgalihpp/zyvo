export function missingRequiredFields(
  item: Record<string, unknown>,
  fields: readonly string[],
): string[] {
  return fields.filter((field) => {
    const value = item[field];
    return typeof value !== "string" || value.trim() === "";
  });
}
