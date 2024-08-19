import axios, { AxiosRequestConfig } from 'axios'
import fs from 'fs'

const API_HOSTNAME = 'https://api.appcircle.io'
export const appcircleApi = axios.create({
  baseURL: API_HOSTNAME.endsWith('/') ? API_HOSTNAME : `${API_HOSTNAME}/`
})

export const getHeaders = (token: string): AxiosRequestConfig['headers'] => {
  let response: AxiosRequestConfig['headers'] = {
    accept: 'application/json',
    'User-Agent': 'Appcircle CLI/1.0.3'
  }

  response.Authorization = `Bearer ${token}`

  return response
}

export async function uploadArtifact(options: {
  token: string
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
        ...getHeaders(options.token),
        ...data.getHeaders(),
        'Content-Type': 'multipart/form-data;boundary=' + data.getBoundary()
      }
    }
  )

  return uploadResponse.data
}
