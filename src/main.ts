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
    console.log('AC_TOKEN:', accessToken)
    console.log('profileID:', profileID)
    console.log('appPath:', appPath)
    console.log('message:', message)

    execSync(`appcircle --version`, { stdio: 'inherit' })
    execSync(`appcircle login --pat=${accessToken}`, { stdio: 'inherit' })
    const output = execSync(
      `appcircle testing-distribution upload --app=${appPath} --distProfileId=${profileID} --message "${message} -o json"`,
      { encoding: 'utf-8' }
    )

    console.log('output:', output)
    const taskIdMatch = output.match(/TaskId:\s*([a-f0-9-]+)/i)

    if (taskIdMatch && taskIdMatch[1]) {
      const taskId = taskIdMatch[1]
      await checkTaskStatus(taskId)
    } else {
      console.log('TaskId not found')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function checkTaskStatus(taskId: string, currentAttempt = 0) {
  const tokenCommand = `appcircle config get AC_ACCESS_TOKEN -o json`
  const output = execSync(tokenCommand, { encoding: 'utf-8' })
  console.log('typeof OUTPUT:', typeof output)
  console.log('OUTPUT:', output)
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
  console.log('stateValue:', res?.stateValue)

  if (res?.stateValue === 1 && currentAttempt < 100) {
    return checkTaskStatus(taskId, currentAttempt + 1)
  } else {
    console.log('App upload completed successfully!')
  }
}
