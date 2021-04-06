import * as cdk from '@aws-cdk/core';
import * as targets from '@aws-cdk/aws-events-targets';
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as events from '@aws-cdk/aws-events';
import getEnv from './common';

export class LambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const policyArn = getEnv('AWS_BOUNDARY_POLICY_ARN');
    if(policyArn) {
      const boundary = iam.ManagedPolicy.fromManagedPolicyArn(this, 'Boundary', policyArn);
      iam.PermissionsBoundary.of(this).apply(boundary);
    }

    // Create the lambda
    const handler = new lambda.Function(this, "LambdaHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../lambda-code/dist/lambda.zip"),
      handler: "check_pipelines.lambdaHandler",
      timeout: cdk.Duration.minutes(5), // 5 mins should be more than enough.
    });

    // Allow it access to SecretsManager.  Strangely there is no Read-only managed policy.
    const secretsManagerReadPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite");
    handler.role?.addManagedPolicy(secretsManagerReadPolicy);

    // And run it every hour.
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(1 hour)')
    });

    rule.addTarget(new targets.LambdaFunction(handler));
  }
}
