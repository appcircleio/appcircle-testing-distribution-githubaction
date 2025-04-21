import axios, { AxiosRequestConfig } from 'axios'
import fs from 'fs'
import FormData from 'form-data'
import path from 'path';

const API_HOSTNAME = 'https://api.appcircle.io'
export const appcircleApi = axios.create({
  baseURL: API_HOSTNAME.endsWith('/') ? API_HOSTNAME : `${API_HOSTNAME}/`
})

export class UploadServiceHeaders {
  static token = ''

  static getHeaders = (): AxiosRequestConfig['headers'] => {
    let response: AxiosRequestConfig['headers'] = {
      accept: 'application/json',
      'User-Agent': 'Appcircle Github Action'
    }

    response.Authorization = `Bearer ${UploadServiceHeaders.token}`

    return response
  }
}

export async function uploadArtifact(options: {
  message: string
  app: string
  distProfileId: string
}) {
  const filePath = options.app
  const fileStat = fs.statSync(filePath)
  const fileName = path.basename(filePath)
  const fileSize = fileStat.size

  const uploadInfoResponse = await appcircleApi.get<{
    fileId: string;
    uploadUrl: string;
  }>(
    `distribution/v1/profiles/${options.distProfileId}/app-versions`,
    {
      params: {
        action: 'uploadInformation',
        fileName: fileName,
        fileSize: fileSize
      },
      headers: UploadServiceHeaders.getHeaders()
    }
  );

  const { fileId, uploadUrl } = uploadInfoResponse.data;

  const fileContent = fs.readFileSync(filePath);
  await axios.put(uploadUrl, fileContent, {
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  const commitResponse = await appcircleApi.post<{
    taskId: string;
  }>(
    `distribution/v1/profiles/${options.distProfileId}/app-versions`,
    {
      fileId: fileId,
      fileName: fileName,
      message: options.message
    },
    {
      params: {
        action: 'commitFileUpload'
      },
      headers: UploadServiceHeaders.getHeaders()
    }
  );

  return commitResponse.data;
}

export async function createDistributionProfile(name: string) {
  const response = await appcircleApi.post(
    `distribution/v2/profiles`,
    { name: name },
    {
      headers: UploadServiceHeaders.getHeaders()
    }
  )
  return response.data
}

export async function getDistributionProfiles() {
  const distributionProfiles = await appcircleApi.get(
    `distribution/v2/profiles`,
    {
      headers: UploadServiceHeaders.getHeaders()
    }
  )
  return distributionProfiles.data
}

export async function getProfileId(
  profileName: string,
  createProfileIfNotExists: boolean
): Promise<string> {
  const profiles = await getDistributionProfiles()
  let profileId: string | null = null

  for (const profile of profiles) {
    if (profile.name === profileName) {
      profileId = profile.id
      break
    }
  }

  if (profileId === null && !createProfileIfNotExists) {
    throw new Error(
      `Error: The test profile '${profileName}' could not be found. The option 'createProfileIfNotExists' is set to false, so no new profile was created. To automatically create a new profile if it doesn't exist, set 'createProfileIfNotExists' to true.`
    )
  }

  if (profileId === null && createProfileIfNotExists) {
    const newProfile = await createDistributionProfile(profileName)
    if (!newProfile || newProfile === null) {
      throw new Error('Error: The new profile could not be created.')
    }

    console.log(`New profile created: ${newProfile.name}`)
    profileId = newProfile.id
  }

  if (!profileId) {
    throw new Error('Error: The profile ID is not found.')
  }

  return profileId
}

export async function checkTaskStatus(
  token: string,
  taskId: string,
  currentAttempt = 0
) {
  const response = await fetch(`${API_HOSTNAME}/task/v1/tasks/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  const res = await response.json()
  if ((res?.stateValue == 0 || res?.stateValue == 1) && currentAttempt < 100) {
    return checkTaskStatus(token, taskId, currentAttempt + 1)
  } else if (res?.stateValue === 2) {
    throw new Error(`Build Upload Task Failed: ${res.stateName}`)
  }
}
