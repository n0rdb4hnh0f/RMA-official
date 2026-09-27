/**
 * The RMA platform sound library.
 *
 * Three recordings cover the three things that can happen at a platform: a
 * service arrives, a service departs, and a service passes through without
 * stopping. The files themselves live in `public/melody`, so they publish at
 * `/melody/…` in development and in the production build alike.
 *
 * The lengths below are what the station page prints, and they are checked
 * against the WAV headers by `scripts/verify-melody.ts`: a melody can no more
 * advertise a length its recording does not have than a line can advertise a
 * colour that fails contrast.
 */

/** The platform event a melody announces. */
export type MelodyEvent = 'arrival' | 'departure' | 'passing'

export type Melody = {
  id: MelodyEvent
  /** Label printed on the station page. */
  label: string
  /** Public path of the recording, served from `public/melody`. */
  file: string
  /** Length of the recording in seconds, verified against the WAV header. */
  seconds: number
  /** What happens on the platform while the melody plays. */
  description: string
}

export const melodies: Melody[] = [
  { id:'arrival', label:'Arrival', file:'/melody/Arrival.wav', seconds:10.28, description:'Plays as a service arrives and the doors are released.' },
  { id:'departure', label:'Departure', file:'/melody/Departure.wav', seconds:6.27, description:'Plays as the doors close and the service leaves the platform.' },
  { id:'passing', label:'Passing', file:'/melody/Passing.wav', seconds:6.78, description:'Plays when a service runs through the platform without stopping.' },
]

/** A melody is only ever addressed by the event it announces. */
export const melodyById = (id: string): Melody | undefined => melodies.find((melody) => melody.id === id)
