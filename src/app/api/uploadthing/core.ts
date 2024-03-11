import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { User } from "lucide-react";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { OpenAIEmbeddings } from "@langchain/openai"
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import  pinecone  from "@/lib/pinecone";
import {PineconeStore} from "@langchain/pinecone"

const f = createUploadthing();

 
export const ourFileRouter = {

    pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
        
        const {getUser} = getKindeServerSession();
        const user = await getUser()


        if(!user || !user.id) throw new Error ("Unauthorized")

        return {userId: user.id, email: user.email};

    })
    .onUploadComplete(async ({ metadata, file }) => {

        const createdFile = await db.file.create({
                data: {
                    key: file.key,
                    name: file.name,
                    url: `https://utfs.io/f/${file.key}`,
                    uploadStatus: "PROCESSING",
                    userNo: metadata.userId
                }
            });

        //AI or text-vector conversion work here
            
        try{
            const response = await fetch(`https://utfs.io/f/${file.key}`);
            const blob = await response.blob();

            //load pdf in the memory
            const loader = new PDFLoader(blob)

            const pageLevelDocs = await loader.load();

            const pagesAmt  = pageLevelDocs.length

            //vectorize the index entire document
            const pineconeIndex =  pinecone.Index("chatwithpdf")


            //this will generate vector from the text
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey:process.env.OPENAI_API_KEY
            })


            const result = await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
                pineconeIndex,
                namespace:createdFile.id
            })


            await db.file.update({
                data:{
                    uploadStatus:"SUCCESS",
                },
                where:{
                    id:createdFile.id
                }
            })

        }catch(err){

            console.error("err", err)

            await db.file.update({
                data:{
                    uploadStatus:"FAILED",
                },
                where:{
                    id:createdFile.id
                }
            })
        }
        
    
        
    }),

} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;