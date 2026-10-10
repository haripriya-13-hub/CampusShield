export function StatusBadge({ status }) {
  const cls = status === "In Progress" ? "In" : status;
  return <span className={`badge b-${cls}`}>{status}</span>;
}
export function PriorityBadge({ priority }) {
  return <span className={`badge pr-${priority}`}>{priority} priority</span>;
}
export function DeptBadge({ dept }) {
  return <span className="badge dept">{dept}</span>;
}
