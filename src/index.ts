import type {
  RPCCallPayload,
  Participant,
  InfinityParticipant
} from '@pexip/plugin-api'
import { ParticipantActivities, registerPlugin } from '@pexip/plugin-api'
import { pino } from 'pino'

export const logger = pino()

const version = 0
const plugin = await registerPlugin({
  id: 'recording-rtmp',
  version
})

const uiState: RPCCallPayload<'ui:button:add'> = {
  position: 'toolbar',
  icon: 'IconPlayRound',
  tooltip: 'Record',
  roles: ['chair']
}

interface Config {
  recordingUri: string
}

let config: Config = { recordingUri: '' }
fetch('./config.json')
  .then(async (res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We know that this is a Config
    config = (await res.json()) as Config
  })
  .catch(logger.error)

let recorder: Participant | null = null
let recorderUri = ''
let me: InfinityParticipant | null = null

plugin.events.participantsActivities.add(async (activitiesData) => {
  for (const activityData of activitiesData) {
    const { roomId, activity } = activityData
    const { participant, type } = activity

    if (
      roomId === 'main' &&
      type === ParticipantActivities.Leave &&
      participant.uri === recorderUri
    ) {
      await handleRecorderLeave(participant)
    }
  }
})

plugin.events.me.add(({ participant }) => {
  me = participant
})

const btn = await plugin.ui.addButton(uiState)

const onBtnClick = async (): Promise<void> => {
  if (recorder === null) {
    let { recordingUri } = config

    recordingUri = recordingUri.replace(
      /{{\s*displayName\s*}}/gm,
      me?.displayName ?? ''
    )

    if (recordingUri === '') {
      const input = await plugin.ui.showForm({
        title: 'Start recording',
        description: 'The recording URI should be a valid RTMPS address.',
        form: {
          elements: {
            recordingUri: {
              name: 'Recording URI',
              type: 'text',
              placeholder: 'rtmps://...'
            }
          },
          submitBtnTitle: 'Start recording'
        }
      })
      const { recordingUri: uri } = input
      recordingUri = uri
    }

    if (recordingUri !== '') {
      await startRecording(encodeURI(recordingUri))
    }
  } else {
    await stopRecording()
  }
}
btn.onClick.add(onBtnClick)

const handleRecorderLeave = async (
  participant: Participant | InfinityParticipant
): Promise<void> => {
  recorder = null
  await changeButtonInactive()
  if (
    typeof participant.startTime === 'number' &&
    !isNaN(participant.startTime)
  ) {
    await plugin.ui.showToast({ message: 'Recording stopped' })
  } else {
    await plugin.ui.showToast({ message: 'Start recording failed' })
  }
}

const startRecording = async (recordingUri: string): Promise<void> => {
  if (
    !recordingUri.startsWith('rtmps://') &&
    !recordingUri.startsWith('rtmp://')
  ) {
    await plugin.ui.showToast({ message: 'Invalid recording URI' })
    return
  }

  recorderUri = recordingUri

  await changeButtonActive()

  try {
    recorder = await plugin.conference.dialOut({
      destination: recordingUri,
      streaming: 'yes',
      role: 'GUEST',
      protocol: 'auto'
    })
    await plugin.ui.showToast({ message: 'Recording started' })
  } catch (error) {
    logger.warn(error)
  }
}

const stopRecording = async (): Promise<void> => {
  if (recorder !== null) {
    const response = await recorder.disconnect()
    if (response?.data.status === 'success') {
      recorder = null
    }
  }

  await changeButtonInactive()
}

const changeButtonActive = async (): Promise<void> => {
  uiState.icon = 'IconStopRound'
  uiState.tooltip = 'Stop recording'
  uiState.isActive = true
  await btn.update(uiState)
}

const changeButtonInactive = async (): Promise<void> => {
  uiState.icon = 'IconPlayRound'
  uiState.tooltip = 'Record'
  uiState.isActive = false
  await btn.update(uiState)
}
