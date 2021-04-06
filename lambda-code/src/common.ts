import * as vm from "azure-devops-node-api";
import * as lim from "azure-devops-node-api/interfaces/LocationsInterfaces";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getSecret(secretKey: string) : Promise<string | undefined> {
  console.debug(`Searching for ${secretKey} in AWS Secrets Manager`)
  const region = process.env.AWS_REGION;
  if(!region) {
    throw new Error("Environment variable AWS_REGION is not set")
  }

  const secretsManagerClient = new SecretsManagerClient({
    region: region
  });

  const secretName = "ADO-Broken-Pipeline-Nag-in-Slack";
  const params = {
    SecretId: secretName
  };

  let secret = undefined;
  try {
    const data: any = await secretsManagerClient.send(new GetSecretValueCommand(params));
    if ("SecretString" in data) {
      secret = data.SecretString;
    } else {  
      // Create a buffer
      const buff = new Buffer(data.SecretBinary, "base64");
      secret = buff.toString("ascii");
    }
    const secretValue = JSON.parse(secret)[secretKey];
    if(secretValue) {
      console.debug(`Found secret ${secretKey}: ***${secretValue.slice(-2)}`)
    }
    return secretValue;
  } catch (error) {
    console.log(`Caught ${JSON.stringify(error)}`)
    throw error;
  }
}

async function getEnv(name: string, optional?: boolean): Promise<string> {
  // Try getting from the environment first.
  let val : string | undefined = process.env[name];
  // If it's not there then try AWS Secrets Manager
  if (!val) {
    val = await getSecret(name);
    if (!val && !optional) {
      throw new Error(`${name} variable not set in environment or AWS Secrets Manager`);
    }
  }
  return val!;
}

export async function getWebApi(serverUrl?: string): Promise<vm.WebApi> {
    serverUrl = serverUrl || await getEnv("API_URL");
    return await getApi(serverUrl);
}

export async function getApi(serverUrl: string): Promise<vm.WebApi> {
  return new Promise<vm.WebApi>(async (resolve, reject) => {
    try {
      const token = await getEnv("API_TOKEN");
      const authHandler = vm.getPersonalAccessTokenHandler(token);
      const option = undefined;

      const vsts: vm.WebApi = new vm.WebApi(serverUrl, authHandler, option);
      const connData: lim.ConnectionData = await vsts.connect();
      console.info(`Authenticated as ${connData.authenticatedUser!.providerDisplayName}`);
      resolve(vsts);
    }
    catch (err) {
      reject(err);
    }
  });
}

export async function getProject(): Promise<string> {
  return getEnv("API_PROJECT");
}

export async function getRepoRegex(): Promise<string> {
  return getEnv("REPO_REGEX");
}

export async function getSlackWebhookURL(): Promise<string> {
  return getEnv("SLACK_WEBHOOK_URL");
}

export async function getPermissionsBoundary() : Promise<string> {
  return getEnv("IAM_PERMISSIONS_BOUNDARY", false");
}

