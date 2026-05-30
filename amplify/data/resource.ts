import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { sendSms } from "../functions/send-sms/resource";
import { approveUser } from "../functions/approve-user/resource";

const schema = a.schema({
  Group: a.model({
    name: a.string().required(),
    description: a.string(),
    recipients: a.hasMany("Recipient", "groupId"),
  }).authorization((allow) => [
    allow.groups(["ADMINS", "APPROVED_USERS"]),
  ]),

  Recipient: a.model({
    firstName: a.string().required(),
    lastName: a.string().required(),
    phoneNumber: a.string().required(),
    groupId: a.id().required(),
    group: a.belongsTo("Group", "groupId"),
  }).authorization((allow) => [
    allow.groups(["ADMINS", "APPROVED_USERS"]),
  ]),

  Template: a.model({
    name: a.string().required(),
    body: a.string().required(),
  }).authorization((allow) => [
    allow.groups(["ADMINS", "APPROVED_USERS"]),
  ]),

  SendLog: a.model({
    templateName: a.string().required(),
    groupName: a.string().required(),
    recipientCount: a.integer().required(),
    status: a.enum(["PENDING", "SENT", "FAILED", "QUOTA_EXCEEDED"]),
    sentAt: a.string().required(),
    sentBy: a.string(),
  }).authorization((allow) => [
    allow.group("ADMINS"),
    allow.groups(["APPROVED_USERS"]).to(["read", "create"]),
  ]),

  DailyQuota: a.model({
    userId: a.string().required(),
    date: a.string().required(),
    sendCount: a.integer().required(),
  }).authorization((allow) => [
    allow.groups(["ADMINS", "APPROVED_USERS"]),
  ]),

  AppSettings: a.model({
    key: a.string().required(),
    value: a.string().required(),
  }).secondaryIndexes((index) => [
    index("key"),
  ]).authorization((allow) => [
    allow.group("ADMINS").to(["create", "update", "delete", "read"]),
    allow.groups(["APPROVED_USERS"]).to(["read"]),
  ]),

  sendSMS: a.mutation()
    .arguments({
      groupId: a.string().required(),
      templateId: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.groups(["ADMINS", "APPROVED_USERS"])])
    .handler(a.handler.function(sendSms)),

  adminAction: a.mutation()
    .arguments({
      action: a.string().required(),
      username: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group("ADMINS")])
    .handler(a.handler.function(approveUser)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
