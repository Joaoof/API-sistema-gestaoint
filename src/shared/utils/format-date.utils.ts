export function formatDateTimeBR(date: Date | string): string {
    const dt = typeof date === "string" ? new Date(date) : date;
    if (!(dt instanceof Date) || isNaN(dt.getTime())) {
        return "";
    }
    return dt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
