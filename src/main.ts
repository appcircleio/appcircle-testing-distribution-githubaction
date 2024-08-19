import * as core from '@actions/core'
import { exec, execSync } from 'child_process'

import { getToken } from './api/authApi'
import {
  getProfileId,
  uploadArtifact,
  UploadServiceHeaders
} from './api/uploadApi'

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
    const profileName = core.getInput('profileName')
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')

    const loginResponse = await getToken(accessToken)
    UploadServiceHeaders.token = loginResponse.access_token

    console.log(loginResponse)

    const uploadResponse = await uploadArtifact({
      message,
      app: appPath,
      distProfileId: profileID
    })

    console.log('uploadResponse:', uploadResponse)

    const profileIdFromName = await getProfileId(profileName, true)
    console.log('profileIdFromName:', profileIdFromName)

    if (!uploadResponse.taskId) {
      core.setFailed('Task ID is not found in the upload response')
    } else {
      await checkTaskStatus(loginResponse.access_token, uploadResponse.taskId)
      console.log(`${appPath} uploaded to Appcircle successfully`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function checkTaskStatus(
  token: string,
  taskId: string,
  currentAttempt = 0
) {
  const response = await fetch(
    `https://api.appcircle.io/task/v1/tasks/${taskId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }
  )
  const res = await response.json()
  if ((res?.stateValue == 0 || res?.stateValue == 1) && currentAttempt < 100) {
    return checkTaskStatus(token, taskId, currentAttempt + 1)
  } else if (res?.stateValue === 2) {
    throw new Error(`Build Upload Task Failed: ${res.stateName}`)
  }
}
