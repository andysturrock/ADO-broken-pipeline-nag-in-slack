import * as cdk from '@aws-cdk/core';
import * as iam from "@aws-cdk/aws-iam";
import getEnv from './common';

export class IAMStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ARN of Role to attach this policy to
    const roleArn = getEnv('AWS_AUTOMATION_ROLE_ARN');

    const role = iam.Role.fromRoleArn(this, "Role", roleArn!);

    const policyStatementProps: iam.PolicyStatementProps = {
      sid: 'AllowAutomationOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:GetTemplate',
        'cloudformation:DeleteStack',
        'cloudformation:DeleteChangeSet',
        'cloudformation:CreateChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DescribeStackEvents',
        's3:*', // TODO - be more specific here.  Not too harmful as should only be granted to the role used for CI/CD.
        'iam:CreateRole',
        'iam:DetachRolePolicy',
        'iam:AttachRolePolicy',
        'iam:DeleteRole',
        'iam:GetRole',
        'iam:PassRole',
        'iam:PutRolePolicy',
        'iam:GetRolePolicy',
        'iam:DeleteRolePolicy',
        'lambda:CreateFunction',
        'lambda:DeleteFunction',
        'lambda:GetFunctionConfiguration',
        'lambda:GetFunction',
        'lambda:AddPermission',
        'lambda:RemovePermission',
        'lambda:PublishLayerVersion',
        'lambda:DeleteLayerVersion',
        'lambda:UpdateFunctionCode',
        'lambda:InvokeFunction',
        'lambda:GetLayerVersion',
        'events:PutRule',
        'events:RemoveTargets',
        'events:DeleteRule',
        'events:DescribeRule',
        'events:PutTargets',
        'cloudfront:CreateDistribution',
        'cloudfront:TagResource',
        'cloudfront:GetDistribution',
        'cloudfront:UpdateDistribution',
        'cloudfront:DeleteDistribution',
        'cloudfront:CreateCloudFrontOriginAccessIdentity',
        'cloudfront:GetCloudFrontOriginAccessIdentity',
        'cloudfront:DeleteCloudFrontOriginAccessIdentity',
        'route53:GetHostedZone',
        'route53:ChangeResourceRecordSets',
        'route53:GetChange',
        'route53:GetChangeRequest',
        'route53:ListResourceRecordSets'
      ],
      resources: ['*']
    };
    const policyStatement = new iam.PolicyStatement(policyStatementProps)
    const policyProps = {roles: [role], statements: [policyStatement]};
    new iam.Policy(this, "Policy", policyProps);
  }
}
