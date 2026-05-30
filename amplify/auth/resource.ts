import { defineAuth } from "@aws-amplify/backend";
import { approveUser } from "../functions/approve-user/resource";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["ADMINS", "APPROVED_USERS"],
  access: (allow) => [
    allow.resource(approveUser).to(["addUserToGroup", "manageUsers"]),
  ],
});
