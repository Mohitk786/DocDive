import { clsx, type ClassValue } from "clsx"
import { Metadata } from "next"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function absoluteUrl(path: string){
  if(typeof window !== "undefined"){
    return path
  }

  if(process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}${path}`

  return `http://localhost:${process.env.PORT ?? 3000}${path}`
}

export function constructMetadata({
  title ="DocChat- Seamlessly Collaborate and Discuss PDFs in Real-Time",
  description="DocChat is your ultimate solution for effortless collaboration on PDF documents. With our innovative SaaS app, you can engage in real-time discussions, annotate, and share insights directly within your PDFs.",
  noIndex=false,
  icons="/favicon.ico"

}:{
  title?: string
  description?: string
  noIndex?: boolean
  icons?:string
} = {}):Metadata{

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    icons,
    metadataBase: new URL('https://doc-dive-itfi.vercel.app'),
    ...(noIndex && {
      robots:{
        index:false,
        follow: false
      }
    })
  }
}