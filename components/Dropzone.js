import {useDropzone} from "react-dropzone";
import * as React from "react";
import {useCallback} from "react";
import {Button} from "@/components/ui/button";

export default function Dropzone({onDrop, className, accept}) {
    const [files, setFiles] = React.useState([]);
    const _localOnDrop = useCallback((acceptedFiles) => {
        console.log('[Dropzone.js] _localOnDrop called with files: ');
        console.log(acceptedFiles);

        // Generate preview for each file
        // If it is audio, use a default audio icon as preview
        // acceptedFiles.map(file => Object.assign(file, {
        //     preview: URL.createObjectURL(file)
        // }));
        acceptedFiles = acceptedFiles.map(file => {
            let preview = '';
            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            } else if (file.type.startsWith('video/')) {
                preview = '/video_icon.png';
            } else if (file.type.startsWith('audio/')) {
                // Use a default audio icon as preview
                preview = '/audio_icon.png';
            } else {
                // Use a default file icon as preview
                preview = '/file_icon.png';
            }
            return Object.assign(file, {preview: preview});
        });
        console.log("Preview file: " + acceptedFiles[0]?.preview);

        if(acceptedFiles.length > 0) {
            console.log(acceptedFiles);
            setFiles(acceptedFiles);
            if (onDrop) onDrop(acceptedFiles);
        }
    }, [onDrop])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        accept: accept || {
            'audio/*': [],
            'video/*': [],
            'image/*': []
        },
        multiple: false,
        onDrop: _localOnDrop
    });

    return (
        <div className={`flex border-2 border-dashed border-gray-300 p-6 rounded-lg ${className}`} {...getRootProps()}>
            {/* Display file preview in the box if file exists, otherwise display file drop info */}
            {
                files.length > 0 ?
                    <div className={'my-auto mx-auto flex flex-col'}>
                        <img
                            src={files[0].preview}
                            className={'object-contain max-h-[50vh] rounded-lg'}
                            alt={files[0].name || 'file preview'}
                            />
                        <p className={'text-center text-gray-700 font-medium mt-4'}>{files[0].name}</p>
                        <p className={'text-center text-gray-400'}>{(files[0].size / 1024 / 1024).toFixed(2)} MB</p>
                        <Button variant={'destructive'} className={'w-fit mx-auto mt-4'} onClick={() => {
                            setFiles([]);
                            if(onDrop) onDrop([]);
                        }}>Remove</Button>
                    </div>
                    :
                    <div className={'my-auto mx-auto'}>
                        <input {...getInputProps()} />
                        {
                            isDragActive ?
                                <p className={'text-center text-gray-500'}>Drop the file here!</p> :
                                <div className={'my-auto mx-auto'}>
                                    <p className={'text-center text-gray-500'}>Drag a file here, or click to select</p>
                                    <p className={'text-center text-gray-400'}>(Max one file, 5MB)</p>
                                </div>
                        }
                    </div>
            }
        </div>
    )
}