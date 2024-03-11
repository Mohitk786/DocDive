"use client"

import { Document, Page, pdfjs } from "react-pdf";
import { Expand, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { useState } from "react";
import SimpleBar from "simplebar-react";
import {useToast } from "./ui/use-toast";
import {useResizeDetector} from "react-resize-detector"


interface PdfFullScreenProps{
    pdfUrl: string
}

const PdfFullscreen = ({pdfUrl}:PdfFullScreenProps) =>{
    
    const [numPages, setNumPages] =  useState<number>()
    const {width, ref} = useResizeDetector()




    const [isOpen,setIsOpen] = useState(false)
    const {toast} = useToast()

    return (
        <Dialog open={isOpen} onOpenChange={(v)=>{
            if(!v){
                setIsOpen(v)
            }
        }}>

            <DialogTrigger asChild onClick={()=>setIsOpen(true)}>
                <Button variant={"ghost"} className="gap-1.5">
                    <Expand className="h-4 w-4"/>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-7xl w-full">
                <SimpleBar autoHide={false} className="max-h-[100vh-10rem mt-6">
                <div ref={ref}>
                        <Document 
                            onLoadSuccess={({numPages})=>setNumPages(numPages)}  //this return {numPages} that is total number of pages in pdf and we will set into numPages
                            loading={
                                <div className="flex justify-center">
                                    <Loader2  className="my-24 h-6 w-6 animate-spin"/>
                                </div>
                            }

                            onLoadError={()=>{
                                toast({
                                    title: "Error loading PDF",
                                    description:"Please try again or refresh the page",
                                    variant: "destructive"
                                })
                            }}
                            
                            file={pdfUrl} //which file to render
                            className="max-h-full"
                            >
                            
                            {new Array(numPages).fill(0).map((_,index)=>(
                            <Page
                                key={index}
                                width={width ? width : 1}
                                pageNumber={index+1} 
                            />
                            ))}    

                        </Document>
                    </div>
                </SimpleBar>
            </DialogContent>

        </Dialog>
    )


}

export default PdfFullscreen;