import type { AppSyncResolverHandler } from "aws-lambda";
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const smsClient = new PinpointSMSVoiceV2Client();
const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient());

const MAX_DAILY_SENDS_DEFAULT = 5;
const MAX_RECIPIENTS_PER_SEND = 100;
const COOLDOWN_SECONDS = 60;
const ALLOWED_PHONE_PREFIX = "+221";
const PHONE_REGEX = /^\+221[0-9]{9}$/;

interface SendSMSArgs {
  groupId: string;
  templateId: string;
}

function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export const handler: AppSyncResolverHandler<SendSMSArgs, unknown> = async (event) => {
  const { groupId, templateId } = event.arguments;
  const userId = event.identity && "sub" in event.identity ? event.identity.sub : "unknown";

  if (userId === "unknown") {
    return JSON.stringify({ success: false, error: "Unauthorized" });
  }

  const today = new Date().toISOString().split("T")[0];

  // Read configurable daily limit from AppSettings
  let maxDailySends = MAX_DAILY_SENDS_DEFAULT;
  try {
    const settingsResult = await ddbDoc.send(new QueryCommand({
      TableName: process.env.APP_SETTINGS_TABLE_NAME,
      IndexName: "gsi-key",
      KeyConditionExpression: "#k = :k",
      ExpressionAttributeNames: { "#k": "key" },
      ExpressionAttributeValues: { ":k": "DAILY_SEND_LIMIT" },
    }));
    if (settingsResult.Items?.[0]?.value) {
      maxDailySends = parseInt(settingsResult.Items[0].value, 10) || MAX_DAILY_SENDS_DEFAULT;
    }
  } catch { /* use default */ }

  // Atomic quota check + increment using conditional expression
  const quotaKey = `${userId}#${today}`;
  try {
    // Try to create new quota record (first send of the day)
    await ddbDoc.send(new PutCommand({
      TableName: process.env.DAILY_QUOTA_TABLE_NAME,
      Item: { id: quotaKey, userId, date: today, sendCount: 1 },
      ConditionExpression: "attribute_not_exists(id)",
    }));
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ConditionalCheckFailedException") {
      // Item exists — try to increment with limit check
      try {
        await ddbDoc.send(new UpdateCommand({
          TableName: process.env.DAILY_QUOTA_TABLE_NAME,
          Key: { id: quotaKey },
          UpdateExpression: "SET sendCount = sendCount + :inc",
          ConditionExpression: "sendCount < :limit",
          ExpressionAttributeValues: { ":inc": 1, ":limit": maxDailySends },
        }));
      } catch (updateErr: unknown) {
        if (updateErr && typeof updateErr === "object" && "name" in updateErr && (updateErr as { name: string }).name === "ConditionalCheckFailedException") {
          return JSON.stringify({
            success: false,
            error: "QUOTA_EXCEEDED",
            message: `Daily limit of ${maxDailySends} bulk sends reached. Try again tomorrow.`,
          });
        }
        throw updateErr;
      }
    } else {
      throw err;
    }
  }

  // Fetch recipients for the group
  const recipientsResult = await ddbDoc.send(new QueryCommand({
    TableName: process.env.RECIPIENT_TABLE_NAME,
    IndexName: "gsi-Group.recipients",
    KeyConditionExpression: "groupId = :gid",
    ExpressionAttributeValues: { ":gid": groupId },
  }));

  const recipients = recipientsResult.Items || [];
  if (recipients.length === 0) {
    return JSON.stringify({ success: false, error: "No recipients in this group" });
  }

  // Enforce max recipients per send
  if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
    return JSON.stringify({
      success: false,
      error: "RECIPIENT_LIMIT",
      message: `Group has ${recipients.length} recipients. Maximum per send is ${MAX_RECIPIENTS_PER_SEND}.`,
    });
  }

  // Cooldown check — prevent rapid-fire sends
  const cooldownKey = `cooldown#${userId}`;
  try {
    const now = Math.floor(Date.now() / 1000);
    await ddbDoc.send(new PutCommand({
      TableName: process.env.DAILY_QUOTA_TABLE_NAME,
      Item: { id: cooldownKey, expiresAt: now + COOLDOWN_SECONDS, userId },
      ConditionExpression: "attribute_not_exists(id) OR expiresAt < :now",
      ExpressionAttributeValues: { ":now": now },
    }));
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ConditionalCheckFailedException") {
      return JSON.stringify({
        success: false,
        error: "COOLDOWN",
        message: `Please wait ${COOLDOWN_SECONDS} seconds between sends.`,
      });
    }
    throw err;
  }

  // Fetch template
  const templateResult = await ddbDoc.send(new GetCommand({
    TableName: process.env.TEMPLATE_TABLE_NAME,
    Key: { id: templateId },
  }));

  const template = templateResult.Item;
  if (!template) {
    return JSON.stringify({ success: false, error: "Template not found" });
  }

  let successCount = 0;
  let failCount = 0;
  const skippedInvalid: string[] = [];

  for (const recipient of recipients) {
    // Validate phone number — only allow Senegal numbers
    if (!isValidPhone(recipient.phoneNumber)) {
      skippedInvalid.push(recipient.phoneNumber);
      failCount++;
      continue;
    }

    // Sanitize name fields (strip non-printable chars)
    const firstName = (recipient.firstName || "").replace(/[^\p{L}\p{N}\s\-'.]/gu, "").slice(0, 50);
    const lastName = (recipient.lastName || "").replace(/[^\p{L}\p{N}\s\-'.]/gu, "").slice(0, 50);

    const message = (template.body as string)
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName);

    try {
      await smsClient.send(new SendTextMessageCommand({
        DestinationPhoneNumber: recipient.phoneNumber,
        MessageBody: message,
        MessageType: "TRANSACTIONAL",
        SenderId: process.env.SENDER_ID,
      }));
      successCount++;
    } catch (err) {
      console.error(`Failed to send to ${recipient.phoneNumber}:`, err);
      failCount++;
    }
  }

  return JSON.stringify({
    success: true,
    sent: successCount,
    failed: failCount,
    total: recipients.length,
    skippedInvalid: skippedInvalid.length > 0 ? skippedInvalid : undefined,
  });
};
