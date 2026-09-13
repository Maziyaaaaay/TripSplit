function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type ExpenseForCsv = {
  description: string;
  amount: number;
  disputed: boolean;
  created_at: string;
  payer_id: string;
  splits: { member_id: string; share_amount: number }[];
};

export function buildExpensesCsv(
  expenses: ExpenseForCsv[],
  nameById: Map<string, string>,
  currency: string
): string {
  const header = ["Date", "Description", "Paid by", "Amount", "Currency", "Disputed", "Splits"];
  const rows = expenses.map((exp) => {
    const date = new Date(exp.created_at).toISOString().slice(0, 10);
    const payer = nameById.get(exp.payer_id) ?? "Unknown";
    const splits = exp.splits
      .map((s) => `${nameById.get(s.member_id) ?? "Unknown"}: ${s.share_amount.toFixed(2)}`)
      .join("; ");
    return [
      date,
      exp.description,
      payer,
      exp.amount.toFixed(2),
      currency,
      exp.disputed ? "Yes" : "No",
      splits,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(","))
    .join("\n");
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
