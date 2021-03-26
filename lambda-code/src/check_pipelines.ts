import * as cm from "./common";
import * as vm from "azure-devops-node-api";

import * as ba from "azure-devops-node-api/BuildApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";

async function lambdaHandler(event: any): Promise<any> {
  try {
    const queries = JSON.stringify(event.queryStringParameters);

    const vsts: vm.WebApi = await cm.getWebApi();
    const vstsBuild: ba.IBuildApi = await vsts.getBuildApi();

    const project = await cm.getProject();
    const repoRegex = await cm.getRepoRegex();
    console.info(`Looking at project: ${project} for repos like ${repoRegex}`);
    
    const definitionReferences: bi.DefinitionReference[] = await vstsBuild.getDefinitions(project);
    
    console.info(`There are ${definitionReferences.length} build definition(s)`);

    let definitionReference: bi.DefinitionReference;
    for(definitionReference of definitionReferences) {
      const buildDefinition: bi.BuildDefinition = await vstsBuild.getDefinition(project, definitionReference.id!);
      
      const repo: bi.BuildRepository = buildDefinition.repository!;
      
      if(repo.name!.match(repoRegex)) {
        console.debug(`Checking ${definitionReference.name} (${definitionReference.id}) in repo ${repo.name}`);
        const builds: bi.Build[] = await vstsBuild.getBuilds(
          project, 
          [buildDefinition.id!],      // definitions?: number[] 
          null!,                      // queues?: number[]
          null!,                      // buildNumber?: string
          null!,                      // minFinishTime?: Date
          null!,                      // maxFinishTime?: Date
          null!,                      // requestedFor?: string
          bi.BuildReason.All,         // reasonFilter?: BuildInterfaces.BuildReason
          bi.BuildStatus.Completed,   // statusFilter?: BuildInterfaces.BuildStatus
          null!,                      // resultFilter?: BuildInterfaces.BuildResult.  (passing null means all)
          null!,                      // tagFilters: string[]
          null!,                      // properties: string[]
          1                           // top: number.  Just get one, which will be the latest
          // continuationToken?: string,
          // maxBuildsPerDefinition?: number,
          // deletedFilter?: BuildInterfaces.QueryDeletedOption,
          // queryOrder?: BuildInterfaces.BuildQueryOrder,
          // branchName?: string,
          // buildIds?: number[], 
          // repositoryId?: string,
          // repositoryType?: string)
        );
          
        const build = builds[0];
        if(!build) {
          console.debug(`No (failed) builds for ${definitionReference.name}`);
        }
        // We're OK with cancelled etc, just flag up actual failed builds.
        // console.log(`build.result = ${build.result}`)
        // console.log(`build = ${JSON.stringify(build)}`)
        if(build && build.result == bi.BuildResult.Failed) {
          console.error(`Last build of ${definitionReference.name} has Failed state`)
          const commit = `${repo.url}/commit/${build.sourceVersion}`;
          console.info(`Possibly this commit: ${commit}`);
        }
      } else {
        console.debug(`Ignoring ${definitionReference.name} (${definitionReference.id}) in repo ${repo.name}`);
      }
    }

    return {
      statusCode: 200,
      body: `Queries: ${queries}`
    }
  }
  catch (err) {
    console.error(`Error: ${err.stack}`);
    return {
      statusCode: 500,
      body: "Error"
    }
  }
}

export { lambdaHandler };