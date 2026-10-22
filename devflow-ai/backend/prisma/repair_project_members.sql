INSERT INTO "ProjectMember" ("id", "projectId", "userId", "role", "joinedAt")
SELECT
    gen_random_uuid(),
    p."id",
    p."createdById",
    'PROJECT_MANAGER'::"ProjectRole",
    p."createdAt"
FROM "Project" p
JOIN "WorkspaceMember" wm
    ON wm."workspaceId" = p."workspaceId"
   AND wm."userId" = p."createdById"
WHERE NOT EXISTS (
    SELECT 1
    FROM "ProjectMember" pm
    WHERE pm."projectId" = p."id"
      AND pm."userId" = p."createdById"
);
