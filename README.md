# ADO-broken-pipeline-nag-in-slack
Put a nagging message in a Slack channel periodically when an Azure DevOps pipeline is in a failed state

# How to use
Run the CDK to create the required infrastructure-as-code and deploy the lambda which provides the functionality.

If your AWS environment is strict about IAM permissions, you will need to run the IAM stack first, possibly as a user/role with privileges to grant IAM permissions to other users/roles.  You will need to edit the env.template file and rename it to .env to provide the parameters for your environment, in particular the ARN of the role you use for running infra-as-code automation.  If your organisation uses boundary policies, you will also need to provide the ARN of the boundary policy.
```
$ cd cdk
$ cat .env
CUSTOM_DOMAIN_NAME=example.com
R53_ZONE_ID=zoneid
LAMBDA_VERSION=0.0.1
AWS_AUTOMATION_ROLE_ARN=arn:aws:iam::123456789012:role/AUTOMATION_ROLE
# This is optional
AWS_BOUNDARY_POLICY_ARN=arn:aws:iam::123456789012:policy/policy_UserBoundary

$ cdk bootstrap --public-access-block-configuration false
$ cdk deploy IAMStack --profile <privileged role>
$ cdk deploy LambdaStack --profile <automation role> --public-access-block-configuration
```
The `--public-access-block-configuration false` flag is required if you have restrictions on public S3 buckets, as many organisations do.
