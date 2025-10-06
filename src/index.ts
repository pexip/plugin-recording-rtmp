import type {
  RPCCallPayload,
  Participant,
  InfinityParticipant
} from '@pexip/plugin-api'
import { registerPlugin } from '@pexip/plugin-api'

const plugin = await registerPlugin({
  id: 'recording-rtmp',
  version: 0
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

let config: Config
fetch('./config.json')
  .then(async (res) => {
    config = await res.json()
  })
  .catch((e: Error) => {
    console.error(e)
  })

let recorder: Participant | null = null
let recorderUri = ''
let me: InfinityParticipant | null = null

plugin.events.participantLeft.add(async ({ id, participant }) => {
  if (id === 'main' && participant.uri === recorderUri) {
    recorder = null
    await changeButtonInactive()
    if (participant.startTime === null) {
      await plugin.ui.showToast({ message: 'Start recording failed' })
    } else {
      await plugin.ui.showToast({ message: 'Recording stopped' })
    }
  }
})

plugin.events.me.add(({ participant }) => {
  me = participant
})

const btn = await plugin.ui.addButton(uiState).catch((e) => {
  console.warn(e)
})

const onBtnClick = async (): Promise<void> => {
  if (recorder !== null) {
    await stopRecording()
  } else {
    let recordingUri = config?.recordingUri ?? ''

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
      recordingUri = input.recordingUri ?? ''
    }

    if (recordingUri !== '') {
      await startRecording(encodeURI(recordingUri))
    }
  }
}
btn?.onClick.add(onBtnClick)

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
  } catch (e) {
    console.warn(e)
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
  await btn?.update(uiState)
}

const changeButtonInactive = async (): Promise<void> => {
  uiState.icon = 'IconPlayRound'
  uiState.tooltip = 'Record'
  uiState.isActive = false
  await btn?.update(uiState)
}
