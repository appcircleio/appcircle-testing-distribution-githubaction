import * as core from '@actions/core'

import { getToken } from './api/authApi'
import {
  checkTaskStatus,
  getOrganizationId,
  getProfileId,
  setApiEndpoint,
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
    const authEndpoint =
      core.getInput('authEndpoint') || 'https://auth.appcircle.io'
    const apiEndpoint =
      core.getInput('apiEndpoint') || 'https://api.appcircle.io'
    const profileName = core.getInput('profileName')
    const createProfileIfNotExists = core.getBooleanInput(
      'createProfileIfNotExists'
    )
    const appPath = core.getInput('appPath')
    const message = core.getInput('message')
    const subOrganizationName = core.getInput('subOrganizationName')

    setApiEndpoint(apiEndpoint)

    const validExtensions = ['.ipa', '.apk', '.aab', '.zip']
    const fileExtension = appPath.slice(appPath.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      core.setFailed(
        `Invalid file extension for '${appPath}'. Please use one of the following:\n` +
          `- Android: .apk or .aab\n` +
          `- iOS: .ipa or .zip(.xcarchive)`
      )
      return
    }

    const loginResponse = await getToken(personalAPIToken, authEndpoint)
    let accessToken = loginResponse.access_token
    UploadServiceHeaders.token = accessToken
    console.log('Logged into Appcircle successfully.')

    if (subOrganizationName) {
      const subOrganizationId = await getOrganizationId(subOrganizationName)
      let subLoginResponse
      try {
        subLoginResponse = await getToken(
          personalAPIToken,
          authEndpoint,
          subOrganizationId
        )
      } catch (error: any) {
        const status = error?.response?.status
        throw new Error(
          `Could not authenticate against sub-organization '${subOrganizationName}'` +
            `${status ? ` (HTTP ${status})` : ''}: ${error?.message}`
        )
      }
      if (!subLoginResponse?.access_token) {
        throw new Error(
          `Could not obtain an access token for sub-organization '${subOrganizationName}'.`
        )
      }
      accessToken = subLoginResponse.access_token
      UploadServiceHeaders.token = accessToken
      console.log(`Switched to sub-organization: ${subOrganizationName}`)
    }

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
      await checkTaskStatus(accessToken, uploadResponse.taskId)
      console.log(`${appPath} uploaded to Appcircle successfully`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
