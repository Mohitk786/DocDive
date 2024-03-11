import { db } from "@/db";
import { sendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";


import { OpenAIEmbeddings } from "@langchain/openai"
import pinecone from "@/lib/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { openai } from "@/lib/openai";

import {OpenAIStream, StreamingTextResponse} from "ai"

export const POST = async (req:NextRequest) => {
    
    const body = await req.json()
    
    const {getUser} = getKindeServerSession()
    const user = await getUser()

    const userId = user!.id;
  
    if(!userId) 
        return new Response("Unauthorized", {status:400})

    //verify the data if it is of required type
    const {fileId, message} = sendMessageValidator.parse(body)

    const file = await db.file.findFirst({
        where:{
            id: fileId,
            userNo: userId
        }
    })

    if(!file) return new Response("Not Found", {status:400})


    await db.message.create({
        data:{
            text: message,
            isUserMessage: true,
            userNo: userId,
            fileId: fileId,
        },
    })



    //vectorize the message
    //this will generate vector from the text
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey:process.env.OPENAI_API_KEY
    })

    const pineconeIndex =  pinecone.Index("chatwithpdf")

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace: file.id
    })


    const results = await vectorStore.similaritySearch(message, 4);

    const prevMessages = await db.message.findMany({
        where:{
            fileId
        },
        orderBy:{
            createdAt: "asc" //ascending order
        },
        take: 6               //last 6 messages
    })

    
    
    const formattedPrevMessages = prevMessages.map((msg)=>({
        role:    msg.isUserMessage ? ("user" as const) : ("assistant" as const),
        content: msg.text

    }))


    //prompts to tell openi how to manage conversation => copy and pasted

    const response = await  openai.chat.completions.create({
        model: "gpt-3.5-turbo", 
        temperature: 0,
        stream: true,
        messages: [
            {
              role: 'system',
              content:
                'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
            },
            {
              role: 'user',
              content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
              
        \n----------------\n
        
        PREVIOUS CONVERSATION:
        ${formattedPrevMessages.map((message) => {
          if (message.role === 'user') return `User: ${message.content}\n`
          return `Assistant: ${message.content}\n`
        })}
        
        \n----------------\n
        
        CONTEXT:
        ${results.map((r) => r.pageContent).join('\n\n')}
        
        USER INPUT: ${message}`,
            },
          ],
    })



    //this is like it writting in front of user streaming like chatgpt
    const stream = OpenAIStream(response, {
        async onCompletion(completions){
            await db.message.create({
                data:{
                    text:completions,
                    isUserMessage:false,
                    fileId,
                    userNo:userId
                }
            })
        }
    })



    return new StreamingTextResponse(stream);

}