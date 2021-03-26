import * as cdk from '@aws-cdk/core';
import * as targets from '@aws-cdk/aws-events-targets';
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as events from '@aws-cdk/aws-events';

export class LambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the lambda
    const handler = new lambda.Function(this, "LambdaHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../lambda-code/dist/lambda.zip"),
      handler: "check_pipelines.lambdaHandler",
      timeout: cdk.Duration.seconds(300),
    });

    // Allow it access to SecretsManager.  Strangely there is no Read-only managed policy.
    const secretsManagerReadPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite");
    handler.role?.addManagedPolicy(secretsManagerReadPolicy);

    // And run it every 5 mins.
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(5 minutes)')
    });

    rule.addTarget(new targets.LambdaFunction(handler));
  }
}
