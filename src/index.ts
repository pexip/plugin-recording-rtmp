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
  recordingAddress: string
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

plugin.events.me.add(async ({ participant }) => {
  me = participant
})

const btn = await plugin.ui.addButton(uiState).catch((e) => {
  console.warn(e)
})

const onBtnClick = async (): Promise<void> => {
  if (recorder !== null) {
    await stopRecording()
  } else {
    let recordingAddress = config?.recordingAddress ?? ''

    recordingAddress = recordingAddress.replace(
      /{{\s*displayName\s*}}/gm,
      me?.displayName ?? ''
    )

    if (recordingAddress === '') {
      const input = await plugin.ui.showForm({
        title: 'Start recording',
        description: 'The recording address should be a valid RTMPS address.',
        form: {
          elements: {
            recordingAddress: {
              name: 'Recording address',
              type: 'text',
              placeholder: 'rtmps://...'
            }
          },
          submitBtnTitle: 'Start recording'
        }
      })
      recordingAddress = input.recordingAddress ?? ''
    }

    if (recordingAddress !== '') {
      await startRecording(encodeURI(recordingAddress))
    }
  }
}
btn?.onClick.add(onBtnClick)

const startRecording = async (recordingAddress: string): Promise<void> => {
  if (
    !recordingAddress.startsWith('rtmps://') &&
    !recordingAddress.startsWith('rtmp://')
  ) {
    await plugin.ui.showToast({ message: 'Invalid recording address' })
    return
  }

  recorderUri = recordingAddress

  await changeButtonActive()

  try {
    recorder = await plugin.conference.dialOut({
      destination: recordingAddress,
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
