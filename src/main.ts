import * as core from '@actions/core'
import { execSync } from 'child_process'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    execSync(`npm install -g @appcircle/cli`, { stdio: 'inherit' })
    const accessToken = core.getInput('accessToken')
    const profileID = core.getInput('profileID')
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')

    execSync(`appcircle login --pat=${accessToken}`, { stdio: 'inherit' })
    execSync(
      `appcircle testing-distribution upload --app=${appPath} --distProfileId=${profileID} --message "${message}"`,
      { encoding: 'utf-8' }
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
