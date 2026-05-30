import { defineFunction } from "@aws-amplify/backend";

export const sendSms = defineFunction({
  name: "sendSms",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  environment: {
    SENDER_ID: "FDEV-INFO",
  },
  resourceGroupName: "data",
});
