CREATE UNIQUE INDEX "Project_workspaceId_name_key"
  ON "Project"("workspaceId", "name");

CREATE UNIQUE INDEX "Channel_workspaceId_name_key"
  ON "Channel"("workspaceId", "name");
