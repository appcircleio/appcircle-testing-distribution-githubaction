import * as core from '@actions/core'

import { getToken } from './api/authApi'
import {
  checkTaskStatus,
  getProfileId,
  uploadArtifact,
  UploadServiceHeaders
} from './api/uploadApi'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const personalAPIToken = core.getInput('personalAPIToken')
    const profileName = core.getInput('profileName')
    const createProfileIfNotExists = core.getBooleanInput(
      'createProfileIfNotExists'
    )
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')

    const validExtensions = ['.ipa', '.apk', '.zip', '.aab']
    const fileExtension = appPath.slice(appPath.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      core.setFailed(
        `Invalid file extension: ${appPath}. For Android, use .apk or .aab. For iOS, use .ip, or use zip.`
      )
      return
    }

    const loginResponse = await getToken(personalAPIToken)
    UploadServiceHeaders.token = loginResponse.access_token
    console.log('Logged in to Appcircle successfully')

    const profileIdFromName = await getProfileId(
      profileName,
      createProfileIfNotExists
    )

    const uploadResponse = await uploadArtifact({
      message,
      app: appPath,
      distProfileId: profileIdFromName
    })
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
