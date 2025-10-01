'use client';
import * as React from 'react';
import Sidebar from "@/components/Sidebar";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel} from "@/components/ui/form";
import {Button} from "@/components/ui/button";
import {Combobox} from "@/components/ui/combobox";
import Dropzone from "@/components/Dropzone";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Progress} from "@/components/ui/progress";
import {
    deleteMedia,
    downloadMedia,
    downloadToDevice,
    getAudioCodecByCompatibility,
    getVideoAudioCodecByCompatibility,
    uploadMedia
} from "@/app/helper";
import * as CONSTANTS from "@/app/constants";
import {useEffect, useState} from "react";
import {BASE_API_URL, NONFATAL_ERRORS} from "@/app/constants";
import useWebSocket from "react-use-websocket";

const conversionFormSchema = z.object({
    filename: z.string().min(1, 'Filename is required'),
    outputFormat: z.string().min(1, 'Output format is required')
})
export default function ConvertPage() {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [selectedFileType, setSelectedFileType] = React.useState(null);
    const [isProcessingDialogOpen, setIsProcessingDialogOpen] = React.useState(false);
    const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false);
    const [processingProgress, setProcessingProgress] = React.useState(0);
    const [advancedProgressStats, setAdvancedProgressStats] = React.useState({});
    const [socketUrl, setSocketUrl] = useState(BASE_API_URL.replace('http', 'ws') + '/changeformat');

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

    const conversionForm = useForm({
        resolver: zodResolver(conversionFormSchema),
        defaultValues: {
            filename: '',
            outputFormat: ''
        }
    })

    async function onConversionFormSubmit(data) {
        console.log('[ConvertPage] onConversionFormSubmit called with data: ');
        console.log(data);

        if (!selectedFile) {
            console.error('[ConvertPage] No file selected');
            return;
        }

        setIsProcessingDialogOpen(true);
        setProcessingProgress(0);
        setAdvancedProgressStats({});

        // Upload file to the server
        let fileID = 0;
        try {
            fileID = await uploadMedia(selectedFile);
            console.log(fileID);
            if (fileID === -1) {
                throw new Error('File upload failed');
            }
        } catch (e) {
            console.error(e);
            setIsProcessingDialogOpen(false);
            setIsErrorDialogOpen(true);
            return;
        }

        setSocketUrl(BASE_API_URL.replace('http', 'ws') + '/changeformat');
        console.log('[ConvertPage] Connecting to WebSocket at ' + socketUrl);
        let payload = {
            filename: data.filename,
            output_format: data.outputFormat,
            fileID: fileID,
        }

        // Determine the codec based on the output format and file type
        if(selectedFileType.startsWith('audio/')){
            const audioCodec = getAudioCodecByCompatibility(data.outputFormat).audio_codec;
            if(audioCodec) {
                payload.audio_codec = audioCodec;
            } else {
                console.warn(`No compatible audio codec found for ${data.outputFormat}`);
            }
        }
        else if(selectedFileType.startsWith('video/')){
            const videoAudioCodec = getVideoAudioCodecByCompatibility(data.outputFormat);
            if(videoAudioCodec) {
                payload.video_codec = videoAudioCodec.video_codec;
                payload.audio_codec = videoAudioCodec.audio_codec;
            } else {
                console.warn(`No compatible video/audio codec found for ${data.outputFormat}`);
            }
        }

        console.log('Sending conversion request:', payload);
        sendMessage(JSON.stringify(payload));
        setIsProcessingDialogOpen(true);

    }

    useEffect(() => {
        async function handleMessage() {
            if (!lastMessage) return;
            console.log('[ConvertPage] Received WebSocket message: ', lastMessage);
            try {
                const data = JSON.parse(lastMessage.data);
                if (data.status === 'processing' || data.status === 'progress') {
                    const progressPct = data.progress_percent ? data.progress_percent : 0;
                    console.log('Processing progress:', progressPct);
                    if(progressPct) {
                        setProcessingProgress(progressPct);
                    }
                    setAdvancedProgressStats({
                        fps: data.fps ? data.fps : null,
                        frame: data.frame ? data.frame : null,
                        speed: data.speed ? data.speed : null,
                        time: data.out_time ? data.out_time : null,
                    });
                }
                // a
                else if (data.status === 'error') {   // true for testing purposes
                    // check if the error message is partially matching any of the non-fatal errors
                    if (NONFATAL_ERRORS.some(error => data.message.includes(error))) {
                        console.warn('Non-fatal error occurred while processing file:', data.message);
                    } else {
                        console.error('Error occurred while processing file:', data.message);
                        setIsProcessingDialogOpen(false);
                        setIsErrorDialogOpen(true);
                    }
                } else if (data.status === 'success') {
                    setProcessingProgress(100);
                    setAdvancedProgressStats({});
                    console.log('File conversion successful.');
                    // Trigger file download
                    const outputType = conversionForm.getValues('outputFormat');
                    const originalFilename = conversionForm.getValues('filename');
                    const baseName = originalFilename.includes('.') ? originalFilename.substring(0, originalFilename.lastIndexOf('.')) : originalFilename;
                    const outputFilename = baseName + '.' + outputType;
                    console.log('Downloading file:', outputFilename);
                    const downloadURL = await downloadMedia(data.fileID, outputFilename);
                    await downloadToDevice(downloadURL, outputFilename);
                    await deleteMedia(data.fileID);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }
        handleMessage();
    }, [lastMessage]);

    // Output format options based on mimetype
    const getOutputFormatOptions = () => {
        if (!selectedFileType) return [
            {label: 'MP3', value: 'mp3'},
            {label: 'WAV', value: 'wav'},
            {label: 'MP4', value: 'mp4'},
            {label: 'AVI', value: 'avi'},
            {label: 'MKV', value: 'mkv'}
        ];
        if (selectedFileType.startsWith('audio/')) {
            return [
                {label: 'MP3', value: 'mp3'},
                {label: 'WAV', value: 'wav'},
                {label: 'OGG', value: 'ogg'},
                {label: 'FLAC', value: 'flac'},
                {label: 'AAC', value: 'aac'},
                {label: 'M4A', value: 'm4a'},
                {label: 'OPUS', value: 'opus'},
            ];
        }
        if (selectedFileType.startsWith('video/')) {
            return [
                {label: 'MP4', value: 'mp4'},
                {label: 'MOV', value: 'mov'},
                {label: 'AVI', value: 'avi'},
                {label: 'MKV', value: 'mkv'},
                {label: 'FLV', value: 'flv'},
                {label: 'WEBM', value: 'webm'},
                {label: 'WMV', value: 'WMV'},
            ];
        }
        if (selectedFileType.startsWith('image/')) {
            return [
                {label: 'JPEG', value: 'jpeg'},
                {label: 'PNG', value: 'png'},
                {label: 'GIF', value: 'gif'},
                {label: 'WEBP', value: 'webp'},
                {label: 'BMP', value: 'bmp'},
                {label: 'TIFF', value: 'tiff'},
                {label: 'AVIF', value: 'avif'},
                {label: 'HEIC', value: 'heic'}
            ]
        }
        console.log('Returning default options');
        return [
            {label: 'MP3', value: 'mp3'},
            {label: 'WAV', value: 'wav'},
            {label: 'MP4', value: 'mp4'},
            {label: 'AVI', value: 'avi'},
            {label: 'MKV', value: 'mkv'}
        ];
    };

    return (
        <div id={'main'} className={'flex flex-row w-full'}>
            <Sidebar/>
            <AlertDialog id={'processing-dialog'} open={isProcessingDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        {
                            processingProgress < 100 ?
                                <AlertDialogTitle>Processing {selectedFile ? selectedFile.name : 'your file'}</AlertDialogTitle>
                                :
                                <AlertDialogTitle>Conversion Complete!</AlertDialogTitle>
                        }
                        <Progress value={processingProgress} className={'bg-neutral-200 [&>div]:bg-blue-500'}/>
                    </AlertDialogHeader>
                    <AlertDialogDescription className={'flex flex-col gap-2'}>
                        {
                            processingProgress < 100 ?
                                <>
                                    <p className={'text-slate-600'}>Please wait while we process your file.</p>
                                    <p className={'text-slate-500 text-sm'}>This may take a few seconds depending on the file size and format.</p>
                                    {advancedProgressStats.bitrate && (
                                        <p className={'text-slate-500 text-sm'}>Bitrate: {advancedProgressStats.bitrate}</p>
                                    )}
                                    {advancedProgressStats.fps && (
                                        <p className={'text-slate-500 text-sm'}>FPS: {advancedProgressStats.fps}</p>
                                    )}
                                    {advancedProgressStats.frame && (
                                        <p className={'text-slate-500 text-sm'}>Frame: {advancedProgressStats.frame}</p>
                                    )}
                                    {advancedProgressStats.speed && (
                                        <p className={'text-slate-500 text-sm'}>Speed: {advancedProgressStats.speed}x</p>
                                    )}
                                    {advancedProgressStats.time && (
                                        <p className={'text-slate-500 text-sm'}>Time: {advancedProgressStats.time}</p>
                                    )}
                                </>
                                :
                                <p className={'text-slate-600'}>Your file has been converted successfully!</p>
                        }
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        {processingProgress === 100 && (
                            <AlertDialogAction onClick={() => {setIsProcessingDialogOpen(false)}}>Continue</AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog id={'error-dialog'} open={isErrorDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Error</AlertDialogTitle>
                        <AlertDialogDescription className={'text-red-600'}>
                            An error occurred while processing your request. Please try again later. If the issue persists, email me
                            at <a href={'mailto:shashankprasanna1@gmail.com'} className={'text-blue-600 hover:underline'}>
                            this address
                        </a>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsErrorDialogOpen(false)}>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div id={'content'} className={'p-8 w-full border border-green-300'}>
                <h1 className={'font-inter text-4xl font-bold'}>Convert Files</h1>
                <div id={'convert-section'} className={'mt-8'}>
                    <Form {...conversionForm}>
                        <form onSubmit={conversionForm.handleSubmit(onConversionFormSubmit, (e) => {
                            console.log('[ConvertPage] Form submission errors: ');
                            console.log(e);
                        })} className={'flex flex-row w-9/12'}>
                            <FormField
                                control={conversionForm.control}
                                name={'filename'}
                                render={() => (
                                    <FormItem>
                                        <FormLabel>File to Convert</FormLabel>
                                        <Dropzone onDrop={(files) => {
                                            if(files.length === 0){
                                                conversionForm.setValue('filename', '');
                                                conversionForm.setValue('outputFormat', '');
                                                setSelectedFile(null);
                                                setSelectedFileType(null);
                                                return;
                                            }
                                            const file = files[0]; // for now, only handle one file
                                            conversionForm.setValue('filename', file.name);
                                            conversionForm.setValue('outputFormat', ""); // Reset output format when a new file is selected
                                            setSelectedFile(file);
                                            setSelectedFileType(file.type);
                                            console.log(conversionForm.getValues());
                                        }}
                                                  className={'min-h-[60vh] min-w-[40vw]'}
                                        />
                                    </FormItem>
                                )}
                            />
                            <div className={'flex flex-col'}>
                                <div id={'conversion-options'} className={'ml-30'}>
                                    <FormField
                                        control={conversionForm.control}
                                        name={'outputFormat'}
                                        render={({field}) => (
                                            <FormItem className={'mb-10'}>
                                                <FormLabel>Output Format</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={getOutputFormatOptions()}
                                                        value={field.value}
                                                        placeholder="Select output format"
                                                        disabled={selectedFileType == null}
                                                        className={'w-fit'}
                                                        onValueChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormDescription>The desired output format.</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type={'submit'} className={'bg-emerald-400 hover:bg-emerald-500 w-50 text-lg'}
                                    onClick={() => {
                                        console.log('[ConvertPage] Submit button clicked');
                                        conversionForm.handleSubmit(onConversionFormSubmit);
                                    }}>Convert</Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}