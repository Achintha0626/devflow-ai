import { formatCount, getMemberName } from "./analyticsUtils";

export function TeamWorkload({ members }) {
  const memberList = members || [];
  return (
    <section className="analytics-panel analytics-workload-panel" aria-label="Team workload">
      <header className="analytics-panel__header">
        <div>
          <h2>Team workload</h2>
          <p>Assigned task counts and story points by member</p>
        </div>
        <span className="analytics-panel__total">{formatCount(memberList.length)}</span>
      </header>
      {memberList.length === 0 ? (
        <p className="analytics-empty-note">No project members to show.</p>
      ) : (
        <div className="analytics-table-wrapper">
          <table className="analytics-workload-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Assigned</th>
                <th scope="col">To do</th>
                <th scope="col">In progress</th>
                <th scope="col">In review</th>
                <th scope="col">Done</th>
                <th scope="col">Story points</th>
              </tr>
            </thead>
            <tbody>
              {memberList.map((member) => (
                <tr key={member.user?.id || member.id}>
                  <td>
                    <div className="analytics-workload__member-cell">
                      <div className="analytics-workload__avatar" aria-hidden="true">
                        {getMemberName(member.user).charAt(0).toUpperCase()}
                      </div>
                      <div className="analytics-workload__member-info">
                        <div className="analytics-workload__name">{getMemberName(member.user)}</div>
                        <div className="analytics-workload__role">{(member.role || "Member").replaceAll("_", " ")}</div>
                      </div>
                    </div>
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
        </div>
      )}
    </section>
  );
}
