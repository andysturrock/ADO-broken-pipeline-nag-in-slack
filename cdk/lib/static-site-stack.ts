import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as targets from '@aws-cdk/aws-route53-targets';
import getEnv from './common';

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Can be a top level domain (eg example.com) or (slackapps.example.com)
    // If you are using a subdomain, you must do the delegation outside of this script.
    // ie you must have created the zone and copied the NS records to the parent zone,
    // so that your subdomain is publically discoverable.
    const customDomainName = getEnv('CUSTOM_DOMAIN_NAME');
    const r53ZoneId = getEnv('R53_ZONE_ID');

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: customDomainName,
      hostedZoneId: r53ZoneId,
    });

    const wwwBucket = new s3.Bucket(this, "www-url", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: `www.${customDomainName}`,
      publicReadAccess: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    const certificateArn = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: `www.${customDomainName}`,
      subjectAlternativeNames: [`${customDomainName}`],
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
      region: 'us-east-1', // Cloudfront only checks this region for certificates.
    }).certificateArn;

    // CloudFront distribution that provides HTTPS
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
        aliasConfiguration: {
            acmCertRef: certificateArn,
            names: [ `${customDomainName}`, `www.${customDomainName}` ],
            sslMethod: cloudfront.SSLMethod.SNI,
            securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
        },
        originConfigs: [
            {
                customOriginSource: {
                    domainName: wwwBucket.bucketWebsiteDomainName,
                    originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                },          
                behaviors : [ {isDefaultBehavior: true}],
            }
        ]
    });

    // Route53 alias records for the CloudFront distribution from base of domain and www.domain
    new route53.ARecord(this, 'BaseSiteAliasRecord', {
      recordName: `${customDomainName}`,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone
    });
    new route53.ARecord(this, 'WWWSiteAliasRecord', {
        recordName: `www.${customDomainName}`,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone
    });
      
    const deployment = new s3Deployment.BucketDeployment(this, "StaticContent", {
      sources: [s3Deployment.Source.asset("../static-content")],
      destinationBucket: wwwBucket,
      distribution,
      distributionPaths: ['/*'],
    });

  }
}
