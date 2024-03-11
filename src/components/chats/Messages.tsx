import { trpc } from "@/app/_trpc/client"
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query"
import { keepPreviousData } from "@tanstack/react-query"
import { Loader2, MessageSquare } from "lucide-react"
import Skeleton from "react-loading-skeleton"
import Message from "./Message"
import { useContext } from "react"
import { ChatContext } from "./ChatContext"

interface MessagesProps {
    fileId: string
}

const Messages = ({fileId}:MessagesProps) => {
    

    const {isLoading: isAiThinking} = useContext(ChatContext)


    const {data, isLoading, fetchNextPage} =  trpc.getFileMessages.useInfiniteQuery({
                fileId,
                limit: INFINITE_QUERY_LIMIT,
                }, {
                    getNextPageParam: (lastPage) => 
                    lastPage?.nextCursor, 
                    
                }
    )
    

    const messages = data?.pages.flatMap((page)=>page.messages)
    const loadingMessage = {
        createdAt: new Date().toISOString(),
        id:"loading-message",
        isUserMessage: false,
        text:(
            <span className="flex h-full  items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin"/>
            </span>
        )
    }

    const combinedMessages = [
        ...(isAiThinking ? [loadingMessage]:[]),
        ...(messages ?? [])
    ]

    return (
        <div className="flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-track-blue-lighter scrollbar-thumb-rounded scrollbar-thumb-w-2 scrolling-touch">
            {

                combinedMessages && combinedMessages.length > 0 ? (
                    combinedMessages.map((message, index)=>{

                        // two message from same perosn continuously
                        const isNextMessageSamePerson = combinedMessages[index-1]?.isUserMessage === 
                                                        combinedMessages[index]?.isUserMessage


                        if(index === combinedMessages.length-1) {//last element
                            return <Message 
                                    message={message}
                                    isNextMessageSamePerson={isNextMessageSamePerson} 
                                    key={message.id}
                                />
                        }else{
                            return <Message 
                                        message={message}
                                        isNextMessageSamePerson={isNextMessageSamePerson} 
                                        key={message.id}
                                    />
                        }
                    })
                ) : isLoading ? (
                    <div className="w-full flex flex-col gap-2">
                        <Skeleton className="h-16"/>
                        <Skeleton className="h-16"/>
                        <Skeleton className="h-16"/>
                        <Skeleton className="h-16"/>
                    </div> 
                ) : (
                    <div className="flex-1 flex  flex-col justify-center items-center">
                        <MessageSquare className="h-8 w-9 text-blue-500"/>
                        <h3 className="font-semibold text-xl">You&apos;are all set</h3>
                        <p className="text-zinc-500 text-sm">
                            Ask your first question to get started
                        </p>
                    </div>
                )
            }
        </div>
    )
}

export default Messages