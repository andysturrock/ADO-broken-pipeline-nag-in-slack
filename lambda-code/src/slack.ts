import { IncomingWebhook } from '@slack/webhook';
import { getSlackWebhookURL } from './common';

async function postToWebhook(text: string) {
  const slackWebhookURL = await getSlackWebhookURL();

  // Initialize
  const webhook = new IncomingWebhook(slackWebhookURL);

  await webhook.send({
    text: text,
  });
}

export { postToWebhook };