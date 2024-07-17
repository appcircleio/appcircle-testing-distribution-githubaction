import * as core from '@actions/core'
import { exec, execSync } from 'child_process'

function runCLICommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        reject(error)
        console.error(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await runCLICommand(`npm install -g @appcircle/cli`)
    const accessToken = core.getInput('accessToken')
    const profileID = core.getInput('profileID')
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')

    await runCLICommand(`appcircle login --pat=${accessToken}`)
    const response = await runCLICommand(
      `appcircle testing-distribution upload --app=${appPath} --distProfileId=${profileID} --message "${message}" -o json`
    )
    console.log('upload response:', response)
    const taskId = JSON.parse(response)?.taskId
    console.log('task id:', taskId)
    if (!taskId) {
      core.setFailed('Task ID is not found in the upload response')
    }
    await checkTaskStatus(JSON.parse(response).taskId)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function checkTaskStatus(taskId: string, currentAttempt = 0) {
  const tokenCommand = `appcircle config get AC_ACCESS_TOKEN -o json`
  const output = execSync(tokenCommand, { encoding: 'utf-8' })
  const apiAccessToken = JSON.parse(output)?.AC_ACCESS_TOKEN
  const response = await fetch(
    `https://api.appcircle.io/task/v1/tasks/${taskId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiAccessToken}`
      }
    }
  )
  const res = await response.json()
  if (res?.stateValue == 1 && currentAttempt < 100) {
    return checkTaskStatus(taskId, currentAttempt + 1)
  }
}
