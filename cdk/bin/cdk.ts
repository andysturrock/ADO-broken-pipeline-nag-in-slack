#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { IAMStack } from '../lib/iam-stack';
import { StaticSiteStack } from '../lib/static-site-stack';
import { LambdaStack } from '../lib/lambda-stack';

const app = new cdk.App();
new IAMStack(app, 'IAMStack', {} );
new StaticSiteStack(app, 'StaticSiteStack', {} );
new LambdaStack(app, 'LambdaStack', {} );
  

