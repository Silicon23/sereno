import 'server-only'

import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'


import {
  BotCard,
  BotMessage,
  SpinnerMessage,
  UserMessage
} from '@/components/message'

import { z } from 'zod'
import { Song } from '@/components/music/song'
import { SongSkeleton } from '@/components/music/song-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'


async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    initial:  <SpinnerMessage />,
    system: `\
    You are a compassionate and understanding emotional therapist. Your role is to provide support, empathy, and advice to your clients who are dealing with emotional and psychological issues. You listen carefully, validate their feelings, show sympathy, and offer gentle guidance. Only if the conversation seems to be slowing down or ending:
    1. Gently ask open-ended questions that invite further sharing, without forcing the person to talk.
    2. Avoid bringing up potentially uncomfortable topics or anything that might seem intrusive.
    3. Use prompts that are neutral, positive, or related to the person's interests or feelings they have previously expressed.
    4. Be mindful of the person's emotional state and adjust your approach accordingly.
    
    For the most part, you will act as a empathetic listener. Only try to reignite the conversation when necessary, and let your client take the wheel from there. Try your best to sound sincere and caring.

    Remember to always provide non-judgmental, empathetic responses. Do not offer medical diagnoses or specific medical advice. Encourage seeking professional help if necessary.

    If you feel the need to soothe your client with music, you may offer to recommend a song for them based on their mood.
    `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      recommendSong: {
        description: "Recommends a song for the user based on their emotional state. Call this if the user wants to listen to music.",
        parameters: z.object({
          emotion: z
            .string()
            .describe("The current emotional state of the user. Should be one of \`excited\`, \`delighted\`, \`blissful\`, \`content\`, \`serene\`, \`relaxed\`, \`furious\`, \`annoyed\`, \`disgusted\`, \`dissapointed\`, \`depressed\`, or \`bored\`")
        }),
        generate: async function* ({ emotion }){
          yield(
            <BotCard>
              <SongSkeleton />
            </BotCard>
          )
          // await sleep(2000)


          const song = await selectSong(emotion)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'recommendSong',
                    toolCallId,
                    args: { emotion }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'recommendSong',
                    toolCallId,
                    result: {
                      title: song.title,
                      author: song.author,
                      coverImage: song.coverImage,
                      songUrl: song.songUrl
                    }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Song
                props={{
                  title: song.title,
                  author: song.author,
                  coverImage: song.coverImage,
                  songUrl: song.songUrl
                }}
              />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

interface MetaData {
  title:string;
  author:string;
  coverImage:string;
  songUrl:string;
  arousal:number;
  valence:number;
}

function selectSong(emotion: string) {
  const ArousalValenceMap: { [key: string]: [[number, number], [number, number]] } = {
    excited: [[0.85, 1.0], [0.5, 0.75]],
    delighted: [[0.6, 0.9], [0.6, 0.9]],
    blissful: [[0.5, 0.7], [0.85, 1.0]],
    content: [[0.3, 0.5], [0.85, 1.0]],
    serene: [[0.1, 0.4], [0.6, 0.9]],
    relaxed: [[0.0, 0.15], [0.5, 0.75]],
    furious: [[0.85, 1.0], [0.25, 0.5]],
    annoyed: [[0.6, 0.9], [0.1, 0.4]],
    disgusted: [[0.5, 0.7], [0.0, 0.15]],
    dissapointed: [[0.3, 0.5], [0.0, 0.15]],
    depressed: [[0.1, 0.4], [0.1, 0.4]],
    bored: [[0.0, 0.15], [0.25, 0.5]]
  }
  if (!ArousalValenceMap.hasOwnProperty(emotion)) {
    emotion = "relaxed";
  }
  
  let av = ArousalValenceMap[emotion];
  let arousal = Math.random() * (av[0][1] - av[0][0]) + av[0][0];
  let valence = Math.random() * (av[1][1] - av[1][0]) + av[1][0];

  function euclideanDistance(a: [number, number], b: [number, number]): number {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  const parseCSV = (filePath: string) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedData = Papa.parse<MetaData>(fileContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      return parsedData.data as MetaData[];
    } catch (error) {
      console.error(`Error reading file at ${filePath}:`, error);
      return [];
    }
  };

  const metadata: MetaData[] = parseCSV(path.resolve('lib/data/music_metadata.csv'))

  // Find the song with the closest (arousal, valence)
  let closestSong = metadata[0];
  let minDistance = euclideanDistance([arousal, valence], [metadata[0].arousal, metadata[0].valence]);

  for (const record of metadata) {
    const songArousal = record.arousal;
    const songValence = record.valence;
    const distance = euclideanDistance([arousal, valence], [songArousal, songValence]);

    if (distance < minDistance) {
      minDistance = distance;
      closestSong = record;
    }
  }

  return {
    title: closestSong.title,
    author: closestSong.author,
    coverImage: closestSong.coverImage,
    songUrl: closestSong.songUrl
  };
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    // confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state, done }) => {
    'use server'

    if (!done) return

    const session = await auth()
    if (!session || !session.user) return

    const { chatId, messages } = state

    const createdAt = new Date()
    const userId = session.user.id as string
    const path = `/chat/${chatId}`

    const firstMessageContent = messages[0].content as string
    const title = firstMessageContent.substring(0, 100)

    const chat: Chat = {
      id: chatId,
      title,
      userId,
      createdAt,
      messages,
      path
    }

    await saveChat(chat)
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'recommendSong' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Song props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}