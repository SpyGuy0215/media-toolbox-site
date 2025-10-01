'use client';
import * as React from "react";
import Sidebar from "@/components/Sidebar";
import Dropzone from "@/components/Dropzone";
import {Button} from "@/components/ui/button";
import {Combobox} from "@/components/ui/combobox";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Progress} from "@/components/ui/progress";
import {uploadMedia, downloadMedia, downloadToDevice, deleteMedia} from "@/app/helper";
import {BASE_API_URL, NONFATAL_ERRORS} from "@/app/constants";
import useWebSocket from "react-use-websocket";

export default function TranscribePage() {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [model, setModel] = React.useState("");
    const [outFormat, setOutFormat] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isProcessingDialogOpen, setIsProcessingDialogOpen] = React.useState(false);
    const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false);
    const [processingProgress, setProcessingProgress] = React.useState(0);
    const [advancedProgressStats, setAdvancedProgressStats] = React.useState({});
    const [socketUrl, setSocketUrl] = React.useState("");
    const [wsPayload, setWsPayload] = React.useState(null);
    const [hasDownloaded, setHasDownloaded] = React.useState(false);
    const [uploadedFileID, setUploadedFileID] = React.useState(null);

    const modelOptions = [
        { label: 'tiny', value: 'tiny' },
        { label: 'tiny.en', value: 'tiny.en' },
        { label: 'base', value: 'base' },
        { label: 'base.en', value: 'base.en' },
        { label: 'small', value: 'small' },
        { label: 'small.en', value: 'small.en' }
    ];

    const formatOptions = [
        { label: 'SRT', value: 'srt' },
        { label: 'VTT', value: 'vtt' },
        { label: 'TXT', value: 'txt' },
        { label: 'ASS', value: 'ass' }
    ];

    function baseName(filename){
        if(!filename) return '';
        const idx = filename.lastIndexOf('.');
        return idx === -1 ? filename : filename.substring(0, idx);
    }

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: () => false,
        retryOnError: false,
        onOpen: () => {
            if(wsPayload){
                console.log('[TranscribePage] WS open. Sending queued payload.');
                sendMessage(JSON.stringify(wsPayload));
            }
        }
    });

    function getReturnedContent(data){
        return data.content || data.transcript || data.text || null;
    }

    async function handleTranscribe() {
        if(!selectedFile || !model || !outFormat || isSubmitting) return;
        // Reset like convert page (only progress + stats + flags)
        setIsSubmitting(true);
        setProcessingProgress(0);
        setAdvancedProgressStats({});
        setHasDownloaded(false);
        try {
            const fileID = await uploadMedia(selectedFile);
            if(fileID === -1) throw new Error('Upload failed');
            setUploadedFileID(fileID); // keep reference; do NOT reset on close
            setIsProcessingDialogOpen(true);
            const wsURL = BASE_API_URL.startsWith('https') ? BASE_API_URL.replace('https', 'wss') : BASE_API_URL.replace('http', 'ws');
            const fullUrl = wsURL + '/transcribe-fast';
            const payload = { fileID, filename: selectedFile.name, model, output_format: outFormat };
            setWsPayload(payload);
            if(socketUrl !== fullUrl) {
                setSocketUrl(fullUrl);
            } else if(readyState === 1) {
                sendMessage(JSON.stringify(payload));
            }
        } catch (e) {
            console.error(e);
            setIsErrorDialogOpen(true);
            setIsProcessingDialogOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    React.useEffect(() => {
        if(!lastMessage) return;
        console.log('[TranscribePage] WS message:', lastMessage.data);
        try {
            const data = JSON.parse(lastMessage.data);
            const status = data.status;
            if(status === 'processing' || status === 'progress') {
                let pct = null;
                if(typeof data.progress_percent === 'number') pct = data.progress_percent;
                else if(typeof data.progress === 'number') pct = data.progress;
                if(pct !== null) {
                    pct = Math.min(100, Math.max(0, pct));
                    setProcessingProgress(pct);
                }
                setAdvancedProgressStats({
                    speed: data.speed || null,
                    time: data.out_time || data.time || null,
                    words: data.words || null
                });
            } else if(status === 'error') {
                if(!NONFATAL_ERRORS.some(err => (data.message || '').includes(err))) {
                    console.error('[TranscribePage] Fatal transcription error:', data.message);
                    setIsProcessingDialogOpen(false);
                    setIsErrorDialogOpen(true);
                } else {
                    console.warn('[TranscribePage] Non-fatal error:', data.message);
                }
            } else if(['success','completed','done'].includes(status)) {
                if(processingProgress < 100) setProcessingProgress(100);
                if(!hasDownloaded) {
                    setAdvancedProgressStats({});
                    const outputName = data.filename || data.output_filename || data.outputFilename || (selectedFile ? baseName(selectedFile.name) + '.' + outFormat : 'transcript.' + outFormat);
                    if(uploadedFileID && selectedFile) {
                        (async () => {
                            console.log('[TranscribePage] Downloading transcript using original fileID', uploadedFileID, 'as', outputName);
                            const downloadURL = await downloadMedia(uploadedFileID, outputName);
                            if(downloadURL) {
                                await downloadToDevice(downloadURL, outputName);
                                deleteMedia(uploadedFileID);
                                setHasDownloaded(true);
                            } else {
                                console.warn('[TranscribePage] Failed to obtain download URL; attempting fallback content');
                                const content = getReturnedContent(data);
                                if(content) {
                                    const blob = new Blob([content], {type:'text/plain'});
                                    const url = URL.createObjectURL(blob);
                                    downloadToDevice(url, outputName);
                                    URL.revokeObjectURL(url);
                                    setHasDownloaded(true);
                                }
                            }
                        })();
                    }
                }
            }
        } catch (err) {
            console.error('[TranscribePage] Error parsing WS message:', err);
        }
    }, [lastMessage, hasDownloaded, processingProgress, selectedFile, outFormat, uploadedFileID]);

    return (
        <div id={'main'} className={'flex flex-col md:flex-row w-full min-h-screen'}>
            <Sidebar/>
            <AlertDialog open={isProcessingDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        {processingProgress < 100 ?
                            <AlertDialogTitle>Transcribing {selectedFile ? selectedFile.name : 'file'}</AlertDialogTitle> :
                            <AlertDialogTitle>Transcription Complete!</AlertDialogTitle>
                        }
                        <Progress value={processingProgress} className={'bg-neutral-200 [&>div]:bg-blue-500'} />
                    </AlertDialogHeader>
                    <AlertDialogDescription className={'flex flex-col gap-2'}>
                        {processingProgress < 100 ? (
                            <>
                                <p className={'text-slate-600'}>Your audio is being uploaded and transcribed.</p>
                                {advancedProgressStats.speed && <p className={'text-slate-500 text-sm'}>Speed: {advancedProgressStats.speed}x</p>}
                                {advancedProgressStats.time && <p className={'text-slate-500 text-sm'}>Time: {advancedProgressStats.time}</p>}
                                {advancedProgressStats.words && <p className={'text-slate-500 text-sm'}>Words: {advancedProgressStats.words}</p>}
                            </>
                        ) : (
                            <p className={'text-slate-600'}>Your transcript has been generated successfully!</p>
                        )}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        {processingProgress === 100 && (
                            <AlertDialogAction onClick={() => { setIsProcessingDialogOpen(false); }}>Close</AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isErrorDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Error</AlertDialogTitle>
                        <AlertDialogDescription className={'text-red-600'}>
                            An error occurred while transcribing. Please try again. If it persists contact support.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsErrorDialogOpen(false)}>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div id={'content'} className={'w-full p-4 sm:p-8 max-w-screen-2xl mx-auto flex flex-col'}>
                <h1 className={'font-inter font-bold text-3xl sm:text-4xl'}>Transcribe</h1>
                <p className={'text-slate-600 mt-3 sm:mt-4 text-sm sm:text-base'}>Upload an audio file to generate a transcript.</p>
                <div id={'transcribe-section'} className={'mt-6 sm:mt-8 w-full'}>
                    <div className={'flex flex-col md:flex-row w-full gap-6 lg:gap-10 items-stretch'}>
                        <Dropzone
                            onDrop={(files) => {
                                if(files.length === 0){
                                    setSelectedFile(null);
                                    setOutFormat("");
                                    return;
                                }
                                setSelectedFile(files[0]);
                            }}
                            accept={{ 'audio/*': [] }}
                            className={'min-h-[40vh] w-full md:min-h-[55vh] md:flex-1 rounded-lg border-2 border-dashed border-slate-300 bg-white/60 backdrop-blur-sm'}
                        />
                        <div className={'w-full md:w-80 lg:w-96 flex-shrink-0'}>
                            <div id={'transcription-options'} className={'w-full p-4 sm:p-5 md:p-6 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg flex flex-col'}>
                                <div className={'mb-8'}>
                                    <p className={'text-xs sm:text-sm font-medium mb-2'}>Model</p>
                                    <Combobox
                                        items={modelOptions}
                                        value={model}
                                        placeholder="Select model"
                                        disabled={!selectedFile}
                                        className={'w-full sm:w-fit'}
                                        onValueChange={(val) => setModel(val)}
                                    />
                                    <p className={'text-[11px] sm:text-xs text-slate-500 mt-2'}>Choose a transcription model.</p>
                                </div>
                                <div className={'mb-8'}>
                                    <p className={'text-xs sm:text-sm font-medium mb-2'}>Output Format</p>
                                    <Combobox
                                        items={formatOptions}
                                        value={outFormat}
                                        placeholder="Select format"
                                        disabled={!selectedFile}
                                        className={'w-full sm:w-fit'}
                                        onValueChange={(val) => setOutFormat(val)}
                                    />
                                    <p className={'text-[11px] sm:text-xs text-slate-500 mt-2'}>Subtitle / text file format.</p>
                                </div>
                                <Button
                                    className={'bg-emerald-500 hover:bg-emerald-600 w-full sm:w-52 text-base sm:text-lg'}
                                    disabled={!selectedFile || !model || !outFormat || isSubmitting}
                                    onClick={handleTranscribe}
                                >{isSubmitting ? 'Starting...' : 'Transcribe'}</Button>
                                {selectedFile && (
                                    <p className={'mt-5 text-xs sm:text-sm text-slate-500 break-all'}>Selected: {selectedFile.name}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}