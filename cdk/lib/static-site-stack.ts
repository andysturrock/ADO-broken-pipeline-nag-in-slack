import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as cloudfrontorigins from '@aws-cdk/aws-cloudfront-origins';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as iam from "@aws-cdk/aws-iam";
import getEnv from './common';

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const policyArn = getEnv('AWS_BOUNDARY_POLICY_ARN');
    if(policyArn) {
      const boundary = iam.ManagedPolicy.fromManagedPolicyArn(this, 'Boundary', policyArn);
      iam.PermissionsBoundary.of(this).apply(boundary);
    }

    // Can be a top level domain (eg example.com) or (slackapps.example.com)
    // If you are using a subdomain, you must do the delegation outside of this script.
    // ie you must have created the zone and copied the NS records to the parent zone,
    // so that your subdomain is publically discoverable.
    const customDomainName = getEnv('CUSTOM_DOMAIN_NAME');
    const r53ZoneId = getEnv('R53_ZONE_ID');

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'R53Zone', {
      zoneName: customDomainName!,
      hostedZoneId: r53ZoneId!,
    });

    const wwwBucket = new s3.Bucket(this, "www-bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: `www.${customDomainName}`,
      // publicReadAccess: false,
      // websiteIndexDocument: "index.html",
      // websiteErrorDocument: "error.html",
    });

    const certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: `www.${customDomainName}`,
      subjectAlternativeNames: [`${customDomainName}`],
      hostedZone: zone,
      validation: acm.CertificateValidation.fromDns(zone),
      region: 'us-east-1', // Cloudfront only checks this region for certificates.
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: 'Origin identity to serve s3 bucket content via CloudFront'
    });
    const s3Origin = new cloudfrontorigins.S3Origin(wwwBucket, {
      originAccessIdentity: originAccessIdentity
    });
    const cachePolicy = cloudfront.CachePolicy.fromCachePolicyId(this, 'CachePolicy', '658327ea-f89d-4fab-a63d-7e88639e58f6');
    const behavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cachePolicy,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    }
    const distribution = new cloudfront.Distribution(this, 'CFDistribution', {
      defaultBehavior: behavior,
      certificate: certificate,
      enableIpv6: false,
      enableLogging: true,
      logBucket: wwwBucket,
      logFilePrefix: 'cf-logs/',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      domainNames: [`www.${customDomainName}`]
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
