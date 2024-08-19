import axios, { AxiosRequestConfig } from 'axios'
import fs from 'fs'
import FormData from 'form-data'

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
  const data = new FormData()
  data.append('Message', options.message)
  data.append('File', fs.createReadStream(options.app))

  const uploadResponse = await appcircleApi.post(
    `distribution/v2/profiles/${options.distProfileId}/app-versions`,
    data,
    {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        ...UploadServiceHeaders.getHeaders(),
        ...data.getHeaders(),
        'Content-Type': 'multipart/form-data;boundary=' + data.getBoundary()
      }
    }
  )

  return uploadResponse.data
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
  console.log('profiles:', profiles)
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
    profileId = newProfile.id
  }

  if (!profileId) {
    throw new Error('Error: The profile ID is not found.')
  }

  return profileId
}
