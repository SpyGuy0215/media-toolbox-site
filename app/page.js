'use client';
import React, {useEffect, useRef, useState} from 'react';
import {FaFileAlt, FaFolder, FaPlus, FaTrash, FaUpload} from 'react-icons/fa';
import { LuDownload } from 'react-icons/lu';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Combobox} from "@/components/ui/combobox";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {z} from 'zod';
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {BASE_API_URL, NONFATAL_ERRORS} from "./constants";
import {getAudioCodecByCompatibility, getVideoAudioCodecByCompatibility} from "@/app/helper";
import './globals.css'
import useWebSocket from "react-use-websocket";

const conversionFormSchema = z.object({
    filename: z.string().min(1, 'Filename is required'),
    fileID: z.string().min(1, 'FileID is required'),
    outputFormat: z.string().min(1, 'Output format is required')
})

export default function Home() {
    const [fileList, setFileList] = useState([]);
    const [openFolders, setOpenFolders] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileType, setSelectedFileType] = useState(null);

    const [socketUrl, setSocketUrl] = useState(BASE_API_URL.replace('http', 'ws') + '/changeformat');
    const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [advancedProgressStats, setAdvancedProgressStats] = useState({});
    const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

    const fileInputRef = useRef(null);

    const conversionForm = useForm({
        resolver: zodResolver(conversionFormSchema),
        defaultValues: {
            filename: '',
            fileID: '',
            outputFormat: ''
        }
    })

    function onConversionFormSubmit(data) {
        // send conversion request to the server
        console.log('Conversion form submitted with data:');
        console.log(data);

        // check if file with same filetype already exists with the same fileID
        const existingFile = fileList.find(file => file.id === data.fileID && file.name.endsWith(`.${data.outputFormat}`));
        if(existingFile){
            alert(`File with name ${existingFile.name} already exists. Please delete it first before converting again.`);
            return;
        }

        setProcessingProgress(0);
        setAdvancedProgressStats({});
        setSocketUrl(BASE_API_URL.replace('http', 'ws') + '/changeformat');
        console.log('Starting WebSocket connection to:', socketUrl);

        let payload = {
            filename: data.filename,
            fileID: data.fileID,
            output_format: data.outputFormat,
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

    // handle incoming WebSocket messages
    useEffect(() => {
        if(!lastMessage) return;
        console.log('Received WebSocket message');
        try{
            const data = JSON.parse(lastMessage.data);
            console.log('Parsed data:', data);
            if(data.status === 'progress'){
                setProcessingProgress(data.progress_percent);
                setAdvancedProgressStats({
                    bitrate: data.bitrate? data.bitrate : null,
                    fps: data.fps ? data.fps : null,
                    frame: data.frame ? data.frame : null,
                    speed: data.speed ? data.speed : null,
                    time: data.out_time ? data.out_time : null,
                })
            }
            // a
            else if(data.status === 'error'){   // true for testing purposes
                // check if the error message is partially matching any of the non-fatal errors
                if( NONFATAL_ERRORS.some(error => data.message.includes(error))){
                    console.warn('Non-fatal error occurred while processing file:', data.message);
                }
                else{
                    console.error('Error occurred while processing file:', data.message);
                    setIsProcessingDialogOpen(false);
                    setIsErrorDialogOpen(true);
                }
            }
            else if(data.status === 'success'){
                setProcessingProgress(100);
                // add the new file to the file list
                // get the filename by appending the output format to the original filename (without extension)
                const originalFile = fileList.find(file => file.id === data.fileID);
                let baseFilename = originalFile ? originalFile.name.replace(/\.[^/.]+$/, "") : data.filename;
                // in the output format, get rid of the general type (e.g. audio/mp3 -> mp3)
                const parsedOutputFormat = data.output_format.split('/').pop();
                const newFilename = `${baseFilename}.${data.output_format.includes('/') ? parsedOutputFormat : data.output_format}`;
                // determine if the file is audio, video or image based on the output format
                const newFile = {
                    name: newFilename,
                    id: data.fileID,
                    type: data.output_format,
                };
                setFileList(prevList => [...prevList, newFile]);
            }
        }
        catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, [lastMessage]);

    useEffect(() => {
        console.log('Checking status...')
        // Call the API to check if the server is running
        console.log(BASE_API_URL)
        fetch(`${BASE_API_URL}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Server is running:', data);
            })
            .catch(error => {
                console.error('Error checking server status:', error);
            });
    })

    // Open all folders by default
    useEffect(() => {
        const allFolders = fileList.reduce((acc, file) => {
            acc[file.id] = true;
            return acc;
        }, {});
        setOpenFolders(allFolders);
    }, [fileList]);

    useEffect(() => {
        if (selectedFile) {
            console.log('Selected file changed:', selectedFile);
            console.log('File list:', fileList);
            const file = fileList.find(f => f.id === selectedFile.id && f.name === selectedFile.name);
            if (file) {
                setSelectedFileType(file.type || null);
                console.log('Selected file type:', file.type);
                conversionForm.reset({
                    filename: file.name,
                    fileID: file.id,
                    outputFormat: '' // Reset output format when file changes
                });
            }
        } else {
            console.log('No file selected');
            setSelectedFileType(null);
            conversionForm.reset({
                filename: '',
                fileID: '',
                outputFormat: ''
            });
        }
    }, [selectedFile, fileList]);

    function handleFileInputChange(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);

            fetch(`${BASE_API_URL}/uploadmedia`, {
                method: 'POST',
                body: formData
            })
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return res.json();
                })
                .then(data => {
                    console.log('File uploaded successfully:', data);
                    const fileID = data.fileID;
                    console.log(fileID);
                    setFileList(prevList => [...prevList, {name: file.name, id: fileID, type: file.type}]);
                })
        })
        // Reset the input value so the same file can be selected again
        event.target.value = '';
        console.log(fileList)
    }

    function handleFileRemove(fileID) {
        console.log('Attempting to delete file with ID:', fileID);
        fetch(`${BASE_API_URL}/deletemedia?fileID=${encodeURIComponent(fileID)}`, {
            'method': 'DELETE',
            'headers': {
                'Content-Type': 'application/json'
            },
        })
            .then((r => {
                if (!r.ok) {
                    throw new Error('Network response was not ok');
                }
                return r.json();
            }))
            .then((data) => {
                console.log('File deleted successfully:', data);
                setFileList(fileList.filter(file => file.id !== fileID));
            })
            .catch((error) => {
                console.error('Error deleting file:', error);
            });

        // check if deleted file was also the selected file
        if (selectedFile === fileID) {
            setSelectedFile(null);
        }
    }

    function handleFileDownload(file){
        // download the file from the server
        // send GET request to /downloadmedia?fileID=<fileID>&filename=<filename>
        fetch(`${BASE_API_URL}/downloadmedia?fileID=${encodeURIComponent(file.id)}&filename=${encodeURIComponent(file.name)}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                return res.blob();
            })
            .then(blob => {
                // Create a link element, use it to download the blob, and then remove it
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(error => {
                console.error('Error downloading file:', error);
            });
    }

    // Group files by fileID (folder)
    const filesByFolder = fileList.reduce((acc, file) => {
        if (!acc[file.id]) acc[file.id] = [];
        acc[file.id].push(file);
        return acc;
    }, {});

    const handleToggleFolder = (folderId) => {
        setOpenFolders(prev => ({...prev, [folderId]: !prev[folderId]}));
    };

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
        if(selectedFileType.startsWith('image/')){
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
        return [
            {label: 'MP3', value: 'mp3'},
            {label: 'WAV', value: 'wav'},
            {label: 'MP4', value: 'mp4'},
            {label: 'AVI', value: 'avi'},
            {label: 'MKV', value: 'mkv'}
        ];
    };

    return (
        <div id={'main'} className={'w-screen h-screen flex flex-col items-center bg-neutral-100'}
             onClick={() => setSelectedFile(null)}
        >
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
            <div id={'header'} className={'w-full h-[10vh] flex items-center justify-center px-4 py-4'}>
                <h1 className={'text-slate-800 text-5xl font-semibold w-fit'}>Media Toolbox</h1>
            </div>
            <div id={'file-block-container'} className={'flex flex-row h-full w-screen justify-center items-center'}
                 onClick={e => e.stopPropagation()}>
                <div id={'file-tools'}
                     className={`h-[80%] ${selectedFile ? 'w-[2%]' : 'w-[12.5%]'} flex flex-col justify-end gap-4 items-end pr-10 transition-all duration-300`}>
                    {/* Upload icon button - styled like main upload button, bigger */}
                    <Button
                        id={'icon-upload'}
                        className={'flex flex-row items-center justify-center bg-emerald-500 hover:bg-emerald-400 shadow-lg transition-all duration-300 rounded-lg'}
                        style={{minWidth: 0, width: '70px', height: '70px'}}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                        <FaUpload className={'text-white font-3xl'} size={70} style={{width: '25px', height: '25px'}}/>
                    </Button>
                    {/* Always render the file input, hidden */}
                    <input className={'hidden'} type={'file'} ref={fileInputRef} onChange={handleFileInputChange} multiple />
                </div>
                <div id={'file-block'} className={'flex flex-col w-full h-[80%] bg-white border border-slate-300 rounded-lg shadow-lg'}
                     onClick={() => {
                         setSelectedFile(null);
                         console.log('setting selected file to null');
                     }}>
                    {
                        fileList.length === 0 ?
                            <Button id={'initial-upload'}
                                className={'flex flex-row items-center justify-center bg-emerald-500 hover:bg-emerald-400 px-5 py-10 mx-auto my-auto transition-all duration-300 rounded-lg'}
                                onClick={() => fileInputRef.current.click()} size={'lg'}>
                                <h2 className={'text-3xl text-slate-900 font-semibold'}>Upload</h2>
                                <FaPlus className={'ml-5 text-3xl text-slate-900 w-fit h-fit'}/>
                            </Button>
                        :
                            <div className={'flex flex-col w-full h-full overflow-y-auto p-0'}>
                                {/* Windows File Explorer style hierarchy */}
                                {Object.keys(filesByFolder).length > 0 && (
                                    <div className="flex flex-col w-full">
                                        {Object.entries(filesByFolder).map(([folderId, files]) => (
                                            <React.Fragment key={folderId}>
                                                <div
                                                    className={`flex items-center w-full px-6 py-3 cursor-pointer hover:bg-slate-100 border-b border-slate-200 transition-all duration-200 ${openFolders[folderId] ? 'bg-slate-100' : 'bg-white'}`}
                                                    onClick={() => handleToggleFolder(folderId)}
                                                >
                                                    <FaFolder
                                                        className={`mr-3 text-2xl ${openFolders[folderId] ? 'text-amber-500' : 'text-amber-300'}`}/>
                                                    <span className="text-lg font-semibold text-slate-800 select-none">{folderId}</span>
                                                    <span
                                                        className={`ml-2 text-xs text-slate-500 font-mono bg-slate-200 rounded px-2 py-0.5 ml-auto`}>{files.length} file{files.length > 1 ? 's' : ''}</span>
                                                    <span className="ml-4 text-slate-400">{openFolders[folderId] ? '▼' : '▶'}</span>
                                                    <button
                                                        className="ml-4 text-red-400 hover:text-red-600 transition-colors opacity-80 hover:opacity-100"
                                                        title="Delete folder and all files"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleFileRemove(folderId);
                                                        }}
                                                    >
                                                        <FaTrash className={'text-lg'}/>
                                                    </button>
                                                </div>
                                                {openFolders[folderId] && (
                                                    <div className="flex flex-col w-full pl-14 bg-slate-50">
                                                        {files.map(file => (
                                                            <div key={file.name}
                                                                 className={`flex items-center w-full px-2 py-4 hover:bg-slate-100 rounded transition-all group cursor-pointer ${(selectedFile !== null && selectedFile.id === file.id && selectedFile.name === file.name) ? 'bg-emerald-100 ring-2 ring-emerald-400 border-r-none' : ''}`}
                                                                 onClick={(e) => {
                                                                     e.stopPropagation(); // Prevent click from propagating to the parent div
                                                                     setSelectedFile({
                                                                         id: file.id,
                                                                         name: file.name,
                                                                         type: file.type
                                                                     })
                                                                 }}
                                                            >
                                                                <FaFileAlt className="text-blue-500 mr-3 text-xl"/>
                                                                <span className="text-slate-800 text-lg flex-1">{file.name}</span>
                                                                <button
                                                                    className="mr-4 text-blue-500 hover:text-blue-700 transition-colors opacity-80 hover:opacity-100"
                                                                    title="Download file"
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        handleFileDownload(file);
                                                                    }}
                                                                >
                                                                    <LuDownload className={'text-xl'}/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                    }
                </div>
                <div id={'media-tools'}
                     className={`h-[80%] ${selectedFile ? 'w-[50%] bg-white border border-slate-300 shadow-lg' : 'invisible w-[12.5%] '} transition-all duration:1000 rounded-lg mx-4`}>
                    <Tabs defaultValue="convert" className={'w-full h-full'}>
                        <TabsList className={'w-full flex flex-row border-b border-slate-300'}>
                            <TabsTrigger value={'convert'}>Convert</TabsTrigger>
                            <TabsTrigger value={'transcribe'}>Transcribe</TabsTrigger>
                        </TabsList>
                        <TabsContent value={'convert'} className={'w-full h-full p-4'}>
                            <h2 className={'text-xl font-semibold text-slate-800 mb-4'}>Convert Media</h2>
                            <Form {...conversionForm}>
                                <form onSubmit={conversionForm.handleSubmit(onConversionFormSubmit)} className={'flex flex-col gap-4'}>
                                    <FormField
                                        control={conversionForm.control}
                                        name={'outputFormat'}
                                        render={({field}) => (
                                            <FormItem className={'mb-4'}>
                                                <FormLabel>Output Format</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={getOutputFormatOptions()}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder={'Select output format'}
                                                    />
                                                </FormControl>
                                                <FormDescription>Select the format you want to convert to.</FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type={'submit'} className={'w-full bg-emerald-500 hover:bg-emerald-400 text-white'}>
                                        Convert
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                        <TabsContent value={'transcribe'} className={'w-full h-full p-4'}>
                            <h2 className={'text-xl font-semibold text-slate-800 mb-4'}>Transcribe Media</h2>
                            <h3 className={'text-base'}>Coming soon...</h3>
                            <h4 className={'text-sm text-neutral-500'}>(AKA i'm too lazy to update the frontend)</h4>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            <div id={'footer'} className={'w-screen h-[7vh] flex flex-row items-center px-5'}>
                <h1 className={'text-slate-500 font-mono'}>Made by Shashank Prasanna</h1>
            </div>
        </div>
    )
}
