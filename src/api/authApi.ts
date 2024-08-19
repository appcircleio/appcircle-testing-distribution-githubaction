import axios from 'axios'

const AUTH_HOSTNAME = 'https://auth.appcircle.io'

export async function getToken(pat: string): Promise<any> {
  const params = new URLSearchParams()
  params.append('pat', pat)

  const response = await axios.post(
    `${AUTH_HOSTNAME}/auth/v1/token`,
    params.toString(),
    {
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded'
      }
    }
  )
  return response.data
}
