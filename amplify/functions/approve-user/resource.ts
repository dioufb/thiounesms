import { defineFunction } from "@aws-amplify/backend";

export const approveUser = defineFunction({
  name: "approve-user",
  entry: "./handler.ts",
  resourceGroupName: "auth",
});
