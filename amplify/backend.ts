import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { sendSms } from "./functions/send-sms/resource";
import { approveUser } from "./functions/approve-user/resource";

const backend = defineBackend({
  auth,
  data,
  sendSms,
  approveUser,
});

// Grant sendSms Lambda permission to send SMS
backend.sendSms.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["sms-voice:SendTextMessage"],
    resources: ["*"],
  })
);

// Grant sendSms Lambda access to DynamoDB tables
const recipientTable = backend.data.resources.tables["Recipient"];
const templateTable = backend.data.resources.tables["Template"];
const sendLogTable = backend.data.resources.tables["SendLog"];
const dailyQuotaTable = backend.data.resources.tables["DailyQuota"];
const appSettingsTable = backend.data.resources.tables["AppSettings"];

backend.sendSms.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"],
    resources: [
      recipientTable.tableArn,
      `${recipientTable.tableArn}/index/*`,
      templateTable.tableArn,
      sendLogTable.tableArn,
      dailyQuotaTable.tableArn,
      appSettingsTable.tableArn,
      `${appSettingsTable.tableArn}/index/*`,
    ],
  })
);

// Pass table names to sendSms Lambda
backend.sendSms.addEnvironment("RECIPIENT_TABLE_NAME", recipientTable.tableName);
backend.sendSms.addEnvironment("TEMPLATE_TABLE_NAME", templateTable.tableName);
backend.sendSms.addEnvironment("SEND_LOG_TABLE_NAME", sendLogTable.tableName);
backend.sendSms.addEnvironment("DAILY_QUOTA_TABLE_NAME", dailyQuotaTable.tableName);
backend.sendSms.addEnvironment("APP_SETTINGS_TABLE_NAME", appSettingsTable.tableName);

// Pass User Pool ID to approveUser Lambda
const userPoolId = backend.auth.resources.userPool.userPoolId;
backend.approveUser.addEnvironment("USER_POOL_ID", userPoolId);

// Grant approveUser Lambda full Cognito user management permissions
backend.approveUser.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "cognito-idp:ListUsers",
      "cognito-idp:AdminListGroupsForUser",
      "cognito-idp:AdminAddUserToGroup",
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
