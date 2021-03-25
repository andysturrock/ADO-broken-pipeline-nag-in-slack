import * as cdk from '@aws-cdk/core';
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as lambda from "@aws-cdk/aws-lambda";
import getEnv from './common';

export class LambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Can be a top level domain (eg example.com) or (slackapps.example.com)
    // If you are using a subdomain, you must do the delegation outside of this script.
    // ie you must have created the zone and copied the NS records to the parent zone,
    // so that your subdomain is publically discoverable.
    const customDomainName = getEnv('CUSTOM_DOMAIN_NAME');
    const r53ZoneId = getEnv('R53_ZONE_ID');
    const versionSemVer = getEnv('LAMBDA_VERSION');

    // Create the lambda
    const handler = new lambda.Function(this, "WidgetHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../lambda-code/dist"),
      handler: "check_pipelines.lambdaHandler"
    });

    // Get hold of the hosted zone which has previously been created
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: customDomainName,
      hostedZoneId: r53ZoneId,
    });

    // Create the cert for the gateway.
    // Usefully, this writes the DNS Validation CNAME records to the R53 zone,
    // which is great as normal Cloudformation doesn't do that.
    const acmCertificateForCustomDomain = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: `api.${customDomainName}`,
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create the custom domain
    const customDomain = new apigateway.DomainName(this, 'CustomDomainName', {
      domainName: `api.${customDomainName}`,
      certificate: acmCertificateForCustomDomain,
      endpointType: apigateway.EndpointType.REGIONAL,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2
    });

    // This is the API Gateway which then calls the lambda.
    const api = new apigateway.RestApi(this, "APIGateway", {
      restApiName: "Slack ADO broken pipeline nag service",
      description: "Nag in a Slack channel when an Azure DevOps pipeline is in broken state.",
      deploy: false // create the deployment below
    });

    // By default CDK creates a deployment and a "prod" stage.  That means the URL is something like
    // https://2z2ockh6g5.execute-api.eu-west-2.amazonaws.com/prod/
    // We want to create the stage to match the version id.
    // Semantic versioning has dots as separators but this is invalid in a URL
    // so replace the dots with underscores first.
    const versionIdForURL = versionSemVer.replace(/\./g, '_');
    const apiGatewayDeployment = new apigateway.Deployment(this, 'ApiGatewayDeployment', {
      api: api
    });
    const stage = new apigateway.Stage(this, 'ModelStage', {
      deployment: apiGatewayDeployment,
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      stageName: versionIdForURL
    })

    // Connect the API to the lambda
    const modelLambdaIntegration = new apigateway.LambdaIntegration(model_handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    const modelResource = api.root.addResource('model');
    modelResource.addMethod("GET", modelLambdaIntegration);

    // Create the R53 "A" record to map from the custom domain to the actual API URL
    new route53.ARecord(this, 'CustomDomainAliasRecord', {
      recordName: `api.${customDomainName}`,
      zone: zone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });
    // And path mapping to the API
    customDomain.addBasePathMapping(api, { basePath: `${versionIdForURL}`, stage: stage });

  }
}
