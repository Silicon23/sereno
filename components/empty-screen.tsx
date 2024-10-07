import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Welcome to Sereno AI Chatbot!
        </h1>
        <p className="leading-normal text-muted-foreground">
          This is an open source AI-powered music therapist built using the{' '}
          <ExternalLink href="https://github.com/vercel/ai-chatbot">Next.js AI Chatbot Template</ExternalLink> by{' '}
          <ExternalLink href="https://vercel.com/home">
            Vercel
          </ExternalLink>.
        </p>
        <p className="leading-normal text-muted-foreground">
          Enter any prompt to begin, or click on one of the example prompts below.
        </p>
      </div>
    </div>
  )
}
