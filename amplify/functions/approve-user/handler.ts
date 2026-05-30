import type { AppSyncResolverHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient();
const USER_POOL_ID = process.env.USER_POOL_ID!;

interface ApproveUserArgs {
  username: string;
}

interface ListPendingArgs {
  action: "list" | "approve";
  username?: string;
}

export const handler: AppSyncResolverHandler<ListPendingArgs, unknown> = async (event) => {
  const { action, username } = event.arguments;

  if (action !== "list" && action !== "approve") {
    return JSON.stringify({ error: "Invalid action. Must be 'list' or 'approve'." });
  }

  if (action === "list") {
    // List all users, then filter out those already in APPROVED_USERS
    const usersResult = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60,
    }));

    const pendingUsers = [];
    for (const user of usersResult.Users || []) {
      const groupsResult = await client.send(new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.Username!,
      }));
      const groups = (groupsResult.Groups || []).map(g => g.GroupName);
      if (!groups.includes("APPROVED_USERS") && !groups.includes("ADMINS")) {
        pendingUsers.push({
          username: user.Username,
          email: user.Attributes?.find(a => a.Name === "email")?.Value,
          createdAt: user.UserCreateDate?.toISOString(),
          status: user.UserStatus,
        });
      }
    }
    return JSON.stringify({ users: pendingUsers });
  }

  if (action === "approve" && username) {
    // Validate username format (UUID)
    if (!/^[a-f0-9\-]{36}$/.test(username)) {
      return JSON.stringify({ error: "Invalid username format" });
    }
    await client.send(new AdminAddUserToGroupCommand({
      GroupName: "APPROVED_USERS",
      Username: username,
      UserPoolId: USER_POOL_ID,
    }));
    return JSON.stringify({ success: true, username });
  }

  return JSON.stringify({ error: "Invalid action" });
};
