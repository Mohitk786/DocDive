import { PLANS } from "@/config/stripe";
import { db } from "@/db";
import pinecone from "@/lib/pinecone";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();


const middleware = async () =>{
    const {getUser} = getKindeServerSession();
        const user = await getUser()


        if(!user || !user.id) throw new Error ("Unauthorized")

        const subscriptionPlan = await getUserSubscriptionPlan()

        return {subscriptionPlan, userId: user.id, email: user.email};
}


const onUploadComplete = async ({
        metadata, file
    }:{
        metadata: Awaited<ReturnType<typeof middleware>>
        file:{
            key:string,
            name:string,
            url:string,
        }
    }) => {

        const isFileExist = await db.file.findFirst({
            where:{
                key:file.key
            }
        })

        if(isFileExist) return 

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

        const {subscriptionPlan} = metadata
        const {isSubscribed} = subscriptionPlan

        const isProExceded = pagesAmt > PLANS.find((plan)=>plan.name ==="Pro")!.pagesPerPEDF
        const isFreeExceded = pagesAmt > PLANS.find((plan)=>plan.name ==="Free")!.pagesPerPEDF

        if((isSubscribed && isProExceded) || (!isSubscribed && isFreeExceded)){
            await db.file.update({
                data:{
                    uploadStatus: "FAILED"
                },
                where:{
                    id:createdFile.id
                }
            })
        }

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
    

    


    }

export const ourFileRouter = {

    freePlanUploader: f({ pdf: { maxFileSize: "4MB" } })
        .middleware(middleware)
        .onUploadComplete(onUploadComplete),
    
    proPlanUploader: f({ pdf: { maxFileSize: "16MB" } })
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
    

} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;