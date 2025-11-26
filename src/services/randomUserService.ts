import axios from 'axios'
import type { CitizenProfile, GeoPoint } from '@/types/game'

const randomUserClient = axios.create({
  baseURL: 'https://randomuser.me/api/',
  timeout: 10_000,
})

interface RandomUserApiResponse {
  results: RandomUserApiResult[]
}

interface RandomUserApiResult {
  gender: string
  email: string
  phone: string
  nat: string
  login: { uuid: string; username: string }
  name: { title: string; first: string; last: string }
  dob: { age: number; date: string }
  picture: { large: string }
  location: {
    street: { number: number; name: string }
    city: string
    state: string
    country: string
    postcode: string | number
    coordinates: { latitude: string; longitude: string }
    timezone: { offset: string; description: string }
  }
}

const toNumber = (value: string): number => Number.parseFloat(value) || 0

const toGeoPoint = (coordinates: RandomUserApiResult['location']['coordinates']): GeoPoint => ({
  lat: toNumber(coordinates.latitude),
  lng: toNumber(coordinates.longitude),
})

const toCitizenProfile = (user: RandomUserApiResult): CitizenProfile => ({
  id: user.login.uuid,
  fullName: `${user.name.first} ${user.name.last}`,
  gender: user.gender,
  age: user.dob.age,
  nationality: user.nat,
  occupation: user.login.username.replace(/\d+/g, ' Investigator'),
  email: user.email,
  phone: user.phone,
  residence: `${user.location.city}, ${user.location.country}`,
  coordinates: toGeoPoint(user.location.coordinates),
  portrait: user.picture.large,
  timezone: user.location.timezone.description,
  seed: user.login.username,
})

export const fetchCitizenDataset = async (count = 100): Promise<CitizenProfile[]> => {
  const { data } = await randomUserClient.get<RandomUserApiResponse>('', {
    params: {
      results: count,
      inc:
        'gender,email,phone,nat,login,name,dob,picture,location',
      nat: 'us,gb,ca,au,nz,fr,de,es,dk,fi',
    },
  })

  return data.results.map(toCitizenProfile)
}
