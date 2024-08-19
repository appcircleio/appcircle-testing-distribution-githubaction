import * as core from '@actions/core'
import { exec, execSync } from 'child_process'

import { getToken } from './api/authApi'
import { uploadArtifact } from './api/uploadApi'

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
    const accessToken = core.getInput('accessToken')
    const profileID = core.getInput('profileID')
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')

    const loginResponse = await getToken(accessToken)

    console.log(loginResponse)

    const uploadResponse = await uploadArtifact({
      token: loginResponse.access_token,
      message,
      app: appPath,
      distProfileId: profileID
    })

    console.log('uploadResponse:', uploadResponse)

    // const response = await runCLICommand(
    //   `appcircle testing-distribution upload --app=${appPath} --distProfileId=${profileID} --message "${message}" -o json`
    // )
    // const taskId = JSON.parse(response)?.taskId
    // if (!taskId) {
    //   core.setFailed('Task ID is not found in the upload response')
    // } else {
    //   await checkTaskStatus(JSON.parse(response).taskId)
    //   console.log(`${appPath} uploaded to Appcircle successfully`)
    // }
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
  if ((res?.stateValue == 0 || res?.stateValue == 1) && currentAttempt < 100) {
    return checkTaskStatus(taskId, currentAttempt + 1)
  } else if (res?.stateValue === 2) {
    throw new Error(`Build Upload Task Failed: ${res.stateName}`)
  }
}
