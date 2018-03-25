---
layout: post
title: How To Do Continuous Deployment  On AWS
---

### Intro

I've always thought that deploying new code to production should be as simple as a `git push` to a remote repository, which is why I'm such a big fan of continuous deployment. Everything from building your artifacts, to running your automated tests, to rolling out a new build to production - should be automated. That way you can focus on delivering value to your customers instead of mashing refresh on your browser window to see if Jenkins has finished building your project so you can finally hit that deploy button.

The problem, at least historically was setting up a continuous delivery system was a huge pain in the ass. But with the advent of [AWS Code Pipeline](https://aws.amazon.com/codepipeline/) and [AWS Code Build](https://aws.amazon.com/codebuild/) that's no longer the case. You can setup an end-to-end continuous deployment system that automatically builds & deploys from a Github repository in just a few minutes...well provided you know the right [Cloud Formation](https://aws.amazon.com/cloudformation/) incantation to make it all work.

I've already spent the time to figure this shit out so you don't have to. So let's dive in.

### Overview

#### Strategy

Our goal is to create a continuous delivery pipeline that does the following:

* Poll a Github repo of our choice source changes.
* When a source change is detected, build an AWS Lambda artifact using Code Build (jar in this example).
* Run our automated tests & if they pass, upload our artifact to S3.
* Deploy our code to a Lambda function, and create any necessary resources (eg. Dynamo Tables) via a pre-configured Cloud Formation template in our github repo.

#### Tactics

We'll accomplish this by:

1.  Configuring our Github Repo with a `buildspec.yaml` file so Code Build knows how to build our project
2.  Setting up a Cloud Formation template, geniously named `template.yaml` that will construct our continuous delivery pipeline as a "stack". This way we reuse our template to spin up a new continuous delivery pipeline for any new project using a single command!

### Prepping Your Github Repo

You'll need to add a file called `buildspec.yaml` to the root directory of the Github repo you'd like to setup for continuous deployment. For more information on this file see [Amazon's docs](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html)

```yaml
version: 0.2

phases:
  build:
    commands:
       - echo "starting build..."
       # Build a fat jar of our code using SBT
       - sbt assembly
       # Since we want our pipeline to automatically deploy our changes, we also assume our Github repo also has a Cloud Formation template
       # that contains any resources we need to create for say a Lambda Function, e.x. maybe we need to create a new DynamoDB table
       - aws cloudformation package --template-file template.yaml --s3-bucket your-s3-bucket --output-template-file package.yaml
 cache:
   paths:
    # we can tell Code Build to cache any number of directories,
    # here we are directing it to cache all of our project's dependencies that live in the Ivy cache (a Java/JVM dependency manager - similar to Maven)
     - "~/.ivy2/cache/**/*"
 artifacts:
  discard-paths: yes
  files:
    # These are our "artifacts", e.g. the output of our build system we'd like Code Build to do something with
    - api/target/scala-2.12/assembly-1.0.jar
    - api/package.yaml
```

### Enter Cloud Formation

Since `Cloud Formation` templates are written in YAML (or JSON) - they tend to be pretty verbose, so I'm going to break up this template into pieces (if you want the full template, just skip to the bottom of this post).

#### 1. Parameters

```yaml
AWSTemplateFormatVersion: '2010-09-09'

Parameters:
  # The name of you app. This affects the name of your pipeline,
  # and what S3 bucket artifacts get uploaded to.
  AppName:
    Type: String
    Default: MyApp

  # Which environment you're in - e.g. prod, dev etc.
  # also affects the name of your pipeline and artifact S3 bucket.
  Stage:
    Type: String
    Default: dev

  # Name of your github repo
  GithubRepo:
    Type: String
    Default: your-github-repo-name

  # You need a Github OAuth token or a "personal access token"
  # see: https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/
  GithubOauthToken:
    Type: String
    Default: "****" # You must override this :)
    NoEcho: "true"

  # Github user name,
  # can be an individual account or an organization
  GithubOwner:
    Type: String
    Default: MyOrganization
```

#### 2. S3 Bucket And Code Build

Next we'll need an S3 bucket to store our build artifacts and a Code Build resource that our continuous deployment pipeline will use to build our Github repository. Let's add those now:

```yaml
Resources:
  # S3 -----------------------
  S3Repository:
    Type: "AWS::S3::Bucket"
    Properties:
      AccessControl: "Private"
      BucketName: !Sub "${AppName}-code-pipeline-repository-${Stage}"


  # CODE BUILD ------------------
  # This sets up the Code Build Resource tha we'll refer to in our Pipeline
  CodeBuild:
    Type: "AWS::CodeBuild::Project"
    DependsOn:
      - S3Repository
      - CodeBuildIAM

    Properties:
      Name: !Sub "${GithubRepo}-${Stage}"

      Source:
        Type: CODEPIPELINE

      Artifacts:
        Type: CODEPIPELINE

      ServiceRole: CodeBuildServiceRole

      Environment:
        ComputeType: BUILD_GENERAL1_SMALL
        # In our example, I'm building a Scala app,
        # This is a path to a public Docker image on DockerHub that has sbt installed (Scala's default build tool),
        # You can replace this with a path to a Docker image of your choice, or use one of the AWS managed ones
        Image:  "toolsplus/scala-sbt-aws"
        Type: "LINUX_CONTAINER"

      Cache:
        # This tells Code Build that we want to cache our artifacts and artifact
        # dependencies, which can greatly reduce build times. The configuration
        # that specifies what to cache is a part of the buildspec.yaml that Code Build expects in the
        # Github repository
        Location: !Sub "${AppName}-code-pipeline-repository-${Stage}/artifact-cache"
        Type: S3
```

#### 3. Code Pipeline

Now we'll set up our actual code pipeline, which stitches together all the steps we need to deploy our project, i.e.:

1.  Grab source from Github
2.  Build the project via the `buildspec.yaml` file found in the Github repository's root directory
3.  Create a Cloud Formation changeset (let's pretend we're deploying a Lambda Function)
4.  Deploy that Cloud Formation changeset to production.

```yaml
  # CODE PIPELINE ------------------
  CodePipeline:
    Type: "AWS::CodePipeline::Pipeline"

    DependsOn:
      - CodePipelineIAM
      - S3Repository

    Properties:
      Name: !Sub "${AppName}-code-pipeline-${Stage}"
      RoleArn: !GetAtt "CodePipelineIAM.Arn"

      ArtifactStore:
        Type: S3
        Location: !Sub "${AppName}-code-pipeline-repository-${Stage}"

      Stages:
        # STAGE 1: Grab source from Github
        -
          Name: Source
          Actions:
            -
              Name: SourceAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Source
                Owner: ThirdParty
                Provider: GitHub

              Configuration:
                Branch: master
                Owner: !Ref GithubOwner
                Repo: !Ref GithubRepo
                OAuthToken: !Ref GithubOauthToken
                PollForSourceChanges: "true"

              InputArtifacts: []

              OutputArtifacts:
                - Name: !Sub "${AppName}-source"

        # STAGE 2: Build
        -
          Name: Build
          Actions:
            -
              Name: CodeBuildAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Build
                Owner: AWS
                Provider: CodeBuild

              Configuration:
                ProjectName: !Sub "${GithubRepo}-${Stage}"

              InputArtifacts:
                - Name: !Sub "${AppName}-source"

              OutputArtifacts:
                - Name: !Sub "${AppName}-artifact"

        # STAGE 3: Create Cloud Formation Change Set
        -
          Name: CreateChangeSet
          Actions:
            -
              Name: CreateChangeSetAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation

              Configuration:
                ActionMode: CHANGE_SET_REPLACE
                Capabilities: CAPABILITY_IAM
                ChangeSetName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                RoleArn: !GetAtt "CloudFormationIAM.Arn"
                StackName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                TemplatePath: !Sub "${AppName}-artifact::package.yaml"

              InputArtifacts:
                -
                  Name: !Sub "${AppName}-artifact"

              OutputArtifacts:
                -
                  Name: !Sub "${AppName}-${AWS::Region}-${Stage}"

        # STAGE 4: DEPLOY (EXECUTE) Cloud Formation Change Set
        -
          Name: DeployChangeSet
          Actions:
            -
              Name: DeployChangeSetAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation

              Configuration:
                ActionMode: "CHANGE_SET_EXECUTE"
                ChangeSetName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                StackName: !Sub "${AppName}-${AWS::Region}-${Stage}"

              InputArtifacts:
                -
                  Name: !Sub "${AppName}-${AWS::Region}-${Stage}"

              OutputArtifacts: []
```

#### 4. IAM Permissions

IAM is a great tool, but it's a huge pain in the ass to get all the permissions correct. So here's a copy/pastable template you can use as a starting point that should "just work"
for deploying a simple Lambda project out of the box. Note\* you'll want to lock down several of these permissions, especially for any services you're not using.

```yaml
 CodeBuildIAM:
    Type: "AWS::IAM::Role"
    DependsOn: S3Repository

    Properties:
      RoleName: CodeBuildServiceRole
      Path: "/"
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - codebuild.amazonaws.com

            Action:
              - "sts:AssumeRole"

      Policies:
        -
          PolicyName: CodeBuildServicePolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource:
                  - "*"
              -
                Effect: Allow
                Action:
                  - codecommit:GitPull
                Resource:
                  - "*"
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                Resource:
                  - "*"

              -
                Effect: Allow
                Action:
                  - ssm:GetParameters
                Resource:
                  - "*"

  CodePipelineIAM:
    Type: "AWS::IAM::Role"
    Properties:
      RoleName: CodePipelineServiceRole
      Path: "/"

      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - codepipeline.amazonaws.com

            Action:
              - "sts:AssumeRole"

      Policies:
        -
          PolicyName: CloudFormationPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                  - cloudformation:*
                  - codedeploy:*
                  - codecommit:*
                  - codebuild:*
                  - lambda:*
                  - ssm:GetParameters
                  - iam:PassRole
                  - dynamodb:*
                  - ses:*
                Resource:
                  - "*"

  CloudFormationIAM:
    Type: "AWS::IAM::Role"
    Properties:
      RoleName: CloudFormationServiceRole
      Path: "/"

      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - cloudformation.amazonaws.com

            Action:
              - "sts:AssumeRole"
      Policies:
        -
          PolicyName: CloudFormationPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                  - cloudformation:*
                  - cloudwatch:*
                  - lambda:*
                  - lambda:GetFunction
                  - sns:*
                  - apigateway:*
                  - ssm:GetParameters
                  - ses:*
                  - iam:*
                  - dynamodb:*
                Resource:
                  - "*"
```

### Deploying

Assuming we've saved all of the above to a Cloud Formation template named `template.yaml`,
we can create our shiny new continuous delivery pipeline with a single command using the [AWS CLI tools](https://github.com/aws/aws-cli):

```bash
#!/usr/bin/env bash
aws cloudformation deploy \
     --template-file template.yaml \
     --stack-name my-continuous-delivery-pipeline \
     --parameter-overrides GithubOauthToken=$AWS_GITHUB_TOKEN  GithubOwner=$AWS_GITHUB_USER_NAME \
     --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

You'll notice that we override the `GithubOauthToken` and `GithubOwner` parameters we setup before - this is so we don't
have hardcoded credentials floating around in our Cloud Formation template.

### Full Copy & Paste Example

```yaml
AWSTemplateFormatVersion: '2010-09-09'

Parameters:
  # The name of you app. This affects the name of your pipeline,
  # and what S3 bucket artifacts get uploaded to.
  AppName:
    Type: String
    Default: MyApp

  # Which environment you're in - e.g. prod, dev etc.
  # also affects the name of your pipeline and artifact S3 bucket.
  Stage:
    Type: String
    Default: dev

  # Name of your github repo
  GithubRepo:
    Type: String
    Default: your-github-repo-name

  # You need a Github OAuth token or a "personal access token"
  # see: https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/
  GithubOauthToken:
    Type: String
    Default: "****" # You must override this :)
    NoEcho: "true"

  # Github user name,
  # can be an individual account or an organization
  GithubOwner:
    Type: String
    Default: MyOrganization

Resources:
  # S3 -----------------------
  S3Repository:
    Type: "AWS::S3::Bucket"
    Properties:
      AccessControl: "Private"
      BucketName: !Sub "${AppName}-code-pipeline-repository-${Stage}"


  # CODE BUILD ------------------
  # This sets up the Code Build Resource tha we'll refer to in our Pipeline
  CodeBuild:
    Type: "AWS::CodeBuild::Project"
    DependsOn:
      - S3Repository
      - CodeBuildIAM

    Properties:
      Name: !Sub "${GithubRepo}-${Stage}"

      Source:
        Type: CODEPIPELINE

      Artifacts:
        Type: CODEPIPELINE

      ServiceRole: CodeBuildServiceRole

      Environment:
        ComputeType: BUILD_GENERAL1_SMALL
        # In our example, I'm building a Scala app,
        # This is a path to a public Docker image on DockerHub that has sbt installed (Scala's default build tool),
        # You can replace this with a path to a Docker image of your choice, or use one of the AWS managed ones
        Image:  "toolsplus/scala-sbt-aws"
        Type: "LINUX_CONTAINER"

      Cache:
        # This tells Code Build that we want to cache our artifacts and artifact
        # dependencies, which can greatly reduce build times. The configuration
        # that specifies what to cache is a part of the buildspec.yaml that Code Build expects in the
        # Github repository
        Location: !Sub "${AppName}-code-pipeline-repository-${Stage}/artifact-cache"
        Type: S3


  # CODE PIPELINE ------------------
  CodePipeline:
    Type: "AWS::CodePipeline::Pipeline"

    DependsOn:
      - CodePipelineIAM
      - S3Repository

    Properties:
      Name: !Sub "${AppName}-code-pipeline-${Stage}"
      RoleArn: !GetAtt "CodePipelineIAM.Arn"

      ArtifactStore:
        Type: S3
        Location: !Sub "${AppName}-code-pipeline-repository-${Stage}"

      Stages:
        # STAGE 1: Grab source from Github
        -
          Name: Source
          Actions:
            -
              Name: SourceAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Source
                Owner: ThirdParty
                Provider: GitHub

              Configuration:
                Branch: master
                Owner: !Ref GithubOwner
                Repo: !Ref GithubRepo
                OAuthToken: !Ref GithubOauthToken
                PollForSourceChanges: "true"

              InputArtifacts: []

              OutputArtifacts:
                - Name: !Sub "${AppName}-source"

        # STAGE 2: Build
        -
          Name: Build
          Actions:
            -
              Name: CodeBuildAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Build
                Owner: AWS
                Provider: CodeBuild

              Configuration:
                ProjectName: !Sub "${GithubRepo}-${Stage}"

              InputArtifacts:
                - Name: !Sub "${AppName}-source"

              OutputArtifacts:
                - Name: !Sub "${AppName}-artifact"

        # STAGE 3: Create Cloud Formation Change Set
        -
          Name: CreateChangeSet
          Actions:
            -
              Name: CreateChangeSetAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation

              Configuration:
                ActionMode: CHANGE_SET_REPLACE
                Capabilities: CAPABILITY_IAM
                ChangeSetName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                RoleArn: !GetAtt "CloudFormationIAM.Arn"
                StackName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                TemplatePath: !Sub "${AppName}-artifact::package.yaml"

              InputArtifacts:
                -
                  Name: !Sub "${AppName}-artifact"

              OutputArtifacts:
                -
                  Name: !Sub "${AppName}-${AWS::Region}-${Stage}"

        # STAGE 4: DEPLOY (EXECUTE) Cloud Formation Change Set
        -
          Name: DeployChangeSet
          Actions:
            -
              Name: DeployChangeSetAction
              RunOrder: 1

              ActionTypeId:
                Version: "1"
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation

              Configuration:
                ActionMode: "CHANGE_SET_EXECUTE"
                ChangeSetName: !Sub "${AppName}-${AWS::Region}-${Stage}"
                StackName: !Sub "${AppName}-${AWS::Region}-${Stage}"

              InputArtifacts:
                -
                  Name: !Sub "${AppName}-${AWS::Region}-${Stage}"

              OutputArtifacts: []


  CodeBuildIAM:
    Type: "AWS::IAM::Role"
    DependsOn: S3Repository

    Properties:
      RoleName: CodeBuildServiceRole
      Path: "/"
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - codebuild.amazonaws.com

            Action:
              - "sts:AssumeRole"

      Policies:
        -
          PolicyName: CodeBuildServicePolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource:
                  - "*"
              -
                Effect: Allow
                Action:
                  - codecommit:GitPull
                Resource:
                  - "*"
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                Resource:
                  - "*"

              -
                Effect: Allow
                Action:
                  - ssm:GetParameters
                Resource:
                  - "*"

  CodePipelineIAM:
    Type: "AWS::IAM::Role"
    Properties:
      RoleName: CodePipelineServiceRole
      Path: "/"

      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - codepipeline.amazonaws.com

            Action:
              - "sts:AssumeRole"

      Policies:
        -
          PolicyName: CloudFormationPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                  - cloudformation:*
                  - codedeploy:*
                  - codecommit:*
                  - codebuild:*
                  - lambda:*
                  - ssm:GetParameters
                  - iam:PassRole
                  - dynamodb:*
                  - ses:*
                Resource:
                  - "*"

  CloudFormationIAM:
    Type: "AWS::IAM::Role"
    Properties:
      RoleName: CloudFormationServiceRole
      Path: "/"

      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - cloudformation.amazonaws.com

            Action:
              - "sts:AssumeRole"
      Policies:
        -
          PolicyName: CloudFormationPolicy
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:GetObjectVersion
                  - s3:PutObject
                  - s3:ListBucket
                  - cloudformation:*
                  - cloudwatch:*
                  - lambda:*
                  - lambda:GetFunction
                  - sns:*
                  - apigateway:*
                  - ssm:GetParameters
                  - ses:*
                  - iam:*
                  - dynamodb:*
                Resource:
                  - "*"
```
