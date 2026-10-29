export function getInitials(name: string | undefined) {
    if (!name) return "NN";
    const [a = "", b = ""] = name.trim().split(/\s+/);
    return (a[0] ?? "").concat(b[0] ?? "").toUpperCase();
  }