import * as cm from "./common";
import * as vm from "azure-devops-node-api";

import * as ba from "azure-devops-node-api/BuildApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";

require('dotenv').config()

const logger = cm.logger;

async function run() {
  try {
    const vsts: vm.WebApi = await cm.getWebApi();
    const vstsBuild: ba.IBuildApi = await vsts.getBuildApi();

    const project = cm.getProject();
    logger.info(`Looking at project: ${project}`);
    
    const definitionReferences: bi.DefinitionReference[] = await vstsBuild.getDefinitions(project);
    
    logger.info(`There are ${definitionReferences.length} build definition(s)`);

    let definitionReference: bi.DefinitionReference;
    for(definitionReference of definitionReferences) {
      const buildDefinition: bi.BuildDefinition = await vstsBuild.getDefinition(project, definitionReference.id!);
      
      const repo: bi.BuildRepository = buildDefinition.repository!;
      
      const repoRegex = cm.getRepoRegex();
      if(repo.name!.match(repoRegex)) {
        logger.debug(`Checking ${definitionReference.name} (${definitionReference.id}) in repo ${repo.name}`);
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
          
        const build = builds[0]
        // We're OK with cancelled etc, just flag up actual failed builds.
        if(build.result == bi.BuildResult.Failed) {
          logger.error(`Last build of ${definitionReference.name} has Failed state`)
          // console.log(`build = ${JSON.stringify(build)}`)
          const commit = `${repo.url}/commit/${build.sourceVersion}`;
          console.log(`possibly this? ${commit}`);
        }
      } else {
        logger.debug(`Ignoring ${definitionReference.name} (${definitionReference.id}) in repo ${repo.name}`);
      }
    }
  }
  catch (err) {
    logger.error(`Error: ${err.stack}`);
  }
}

run()