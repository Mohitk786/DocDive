"use client"

//from react-pdf library
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';   
import 'react-pdf/dist/Page/TextLayer.css';         
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

import { useToast } from "./ui/use-toast";
import {useResizeDetector} from "react-resize-detector"
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp, Loader2, RotateCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {useForm} from "react-hook-form"
import {z} from "zod"
import {zodResolver} from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import SimpleBar from "simplebar-react"
import PdfFullscreen from "./PdfFullscreen";

interface PdfRendererProps{
    url: string
}


const PdfRenderer = ({url}:PdfRendererProps) => {

    const [numPages, setNumPages] =  useState<number>()
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1)
    const [rotation, setRotation] = useState(0);
    const [renderedScale,setRenderedScale] = useState<number | null>(null)

    const isLoading = renderedScale !== scale



    //To link zodValidation and form zodResolvers ka use kar liya jo yaha se aaya hai => @hookform/resolvers
    const customPageValidator = z.object({
        page: z.string().refine((num)=>Number(num)>0 && Number(num)<=numPages!)
    })

    type TcustomPageValidator = z.infer<typeof customPageValidator>  //finding typscrpit type of customPageValidator
 
    const {
        register, 
        handleSubmit, 
        formState: {errors}, 
        setValue
        } =       useForm<TcustomPageValidator>({
                        defaultValues: {
                            page:"1"
                        },
                        resolver: zodResolver(customPageValidator)
                         });



    const {toast} = useToast()
    const {width, ref} = useResizeDetector()


    const handlePageSubmit = ({page}:TcustomPageValidator) =>{
        setCurrentPage(Number(page))
        setValue("page", String(page)) //because inputs are always string
    }


    return (
        <div className="w-full bg-white rounded-md flex flex-col items-center">
            <div className="h-14 w-full border-b border-zinc-200 flex items-center justify-between">
               
                <div className="flex items-center gap-1.5">
                    <Button 
                        disabled={currentPage <=1}  //disable rakho jab hum first page par ho
                        onClick={()=>{
                            setCurrentPage((prev)=>(prev-1 > 1 ? prev-1 : prev))
                            setValue("page", String(currentPage-1))
                        }}
                        variant={'ghost'}> 
                        <ChevronDown className='h-4 w-4'/>
                    </Button>

                    <div className="flex items-center gap-1.5">
                        <Input 
                            {...register("page")} 
                            className={cn('w-12 h-8', errors.page && "focus-visible:ring-red-500")}
                            onKeyDown={(e)=>{
                                if(e.key === "Enter"){
                                    handleSubmit(handlePageSubmit)()
                                }
                            }}
                        />

                        <p className="text-zinc-700 text-sm sapce-x-1">
                            <span>/</span>
                            <span>{numPages ?? "x"}</span>
                        </p>
                    </div>

                    <Button
                        disabled={numPages===undefined || currentPage === numPages}
                        // excamation mark  typescript ko ye btane k liye lgaya hai ki numPages kabhi undefined nahi hoga warna wo type pooch rahi thi
                        onClick={()=>{
                            setCurrentPage((prev)=>(prev+1 > numPages! ? numPages! : prev+1))
                            setValue("page", String(currentPage+1))
                        }}
                        variant={'ghost'}> 
                        
                        <ChevronUp className='h-4 w-4'/>
                    </Button>
                </div>

                <div className="space-x-2">
                   
                    {/* zooming code */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="gap-1.5" variant="ghost">
                                <Search className="h-4 w-4"/>  {/*icon*/}
                                {scale*100}%<ChevronDown className="h-3 w-3 opacity-50"/>
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={()=>setScale(1)}>
                                100%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={()=>setScale(1.5)}>
                                150%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={()=>setScale(2)}>
                                200%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={()=>setScale(2.5)}>
                                250%
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                            
                    {/* rotate button */}
                    <Button onClick={()=>setRotation((prev)=>prev+90)} variant="ghost">
                        <RotateCw className="h-4 w-4"/>
                    </Button>

                    <PdfFullscreen pdfUrl={url!}/>

                </div>

            </div>

            <div className="flex-1 w-full max-h-screen">
                
                {/* SimpleBar is for to mange the scaling of pdf */}
                <SimpleBar autoHide={false} className="max-h-[calc(100vh-10rem)]">
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
                            
                            file={url} //which file to render
                            className="max-h-full"
                            >
                            
                                {isLoading && renderedScale ? <Page 
                                    rotate={rotation}
                                    scale={scale}
                                    width={width ? width : 1} 
                                    pageNumber={currentPage}
                                    key={"@"+renderedScale}
                                /> : null}

                                <Page 
                                    className={cn(isLoading?"hidden":"")}
                                    rotate={rotation}
                                    scale={scale}
                                    width={width ? width : 1} 
                                    pageNumber={currentPage}
                                    key={"@"+scale}
                                    loading={
                                        <div className="flex justify-center">
                                            <Loader2 className="my-24 h-6 w-6 animate-spin"/>
                                        </div>
                                    }
                                    onRenderSuccess={()=>setRenderedScale(scale)}
                                />

                        </Document>
                    </div>
                </SimpleBar>

            </div>
        </div>
    )
}

export default PdfRenderer;