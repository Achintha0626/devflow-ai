import { formatCount, getMemberName } from "./analyticsUtils";

export function TeamWorkload({ members }) {
  return (
    <section className="analytics-panel" aria-label="Team workload">
      <header className="analytics-panel__header">
        <div>
          <h2>Team workload</h2>
          <p>Assigned task counts by project member</p>
        </div>
        <span className="analytics-panel__total">{formatCount(members.length)}</span>
      </header>
      {members.length === 0 ? (
        <p className="analytics-empty-note">No project members to show.</p>
      ) : (
        <table className="analytics-workload-table">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Assigned</th>
              <th scope="col">To do</th>
              <th scope="col">In progress</th>
              <th scope="col">In review</th>
              <th scope="col">Done</th>
              <th scope="col">Story pts</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.user.id}>
                <td>
                  <div className="analytics-workload__name">{getMemberName(member.user)}</div>
                  <div className="analytics-workload__role">{member.role.replaceAll("_", " ")}</div>
                </td>
                <td>{formatCount(member.totalAssignedTasks)}</td>
                <td>{formatCount(member.todoTasks)}</td>
                <td>{formatCount(member.inProgressTasks)}</td>
                <td>{formatCount(member.inReviewTasks)}</td>
                <td>{formatCount(member.doneTasks)}</td>
                <td>{formatCount(member.totalStoryPoints)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
