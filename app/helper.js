import * as CONSTANTS from './constants';

export function getVideoAudioCodecByCompatibility(output_format){
    let video_codec, audio_codec;
    if(output_format  === 'webm'){
        video_codec = 'libvpx-vp9';
        audio_codec = 'libvorbis';
    }
    else if(output_format === 'avi'){
        video_codec = 'mpeg4';
        audio_codec = 'mp3';
    }
    else if(output_format === 'flv'){
        video_codec = 'flv';
        audio_codec = 'mp3';
    }
    else if(output_format === 'wmv'){
        video_codec = 'wmv2';
    }
    else if(output_format === 'mov'){
        video_codec = 'libx264';
    }
    else if(output_format === 'mp4'){
        video_codec = 'libx264';
        audio_codec = 'aac';
    }

    return {
        video_codec: video_codec,
        audio_codec: audio_codec
    };
}

export function getAudioCodecByCompatibility(output_format){
    let audio_codec;
    if(output_format === 'ogg'){
        audio_codec = 'libvorbis';
    }
    else if(output_format === 'flac'){
        audio_codec = 'flac';
    }
    else if(output_format === 'mp3'){
        audio_codec = 'libmp3lame';
    }
    else if(output_format === 'aac' || output_format === 'm4a'){
        audio_codec = 'aac';
    }
    else if(output_format === 'opus'){
        audio_codec = 'libopus';
    }
    else if(output_format === 'wav'){
        audio_codec = 'pcm_s16le';
    }
    return {
        audio_codec: audio_codec
    }
}

export async function uploadMedia(file){
    const apiUploadURL = CONSTANTS.BASE_API_URL + '/uploadmedia';
    const formData = new FormData();
    formData.append ('file', file);

    try {
        const response = await fetch(apiUploadURL, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            throw new Error('[UploadMedia()] Network response was not ok');
        }
        const data = await response.json();
        console.log('Successful upload:', data);
        return data.fileID; // File ID is used to reference the uploaded file in further API calls
    } catch (error) {
        console.error('Error:', error);
        return -1;
    }
}

// downloadMedia() function downloads the media file from the server using the provided fileID
export async function downloadMedia(fileID, fileName){
    // Build the URL with query parameters
    const apiDownloadURL = `${CONSTANTS.BASE_API_URL}/downloadmedia?fileID=${encodeURIComponent(fileID)}&filename=${encodeURIComponent(fileName)}`;
    try{
        const response = await fetch(apiDownloadURL, {
            method: 'GET'
        });
        if (!response.ok) {
            throw new Error('[DownloadMedia()] Network response was not ok');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        console.log('Successful media download:', url);
        return url; // Return the object URL for further use
    }
    catch (error) {
        console.error('Error:', error);
        return null;
    }
}



// downloadToDevice() function saves the media file to the user's device
export function downloadToDevice(fileURL, fileName){
    const link = document.createElement('a');
    link.append();
    link.href = fileURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(fileURL); // Clean up the object URL
    console.log('Download initiated for', fileName);
}

export function deleteMedia(fileID){
    const apiDeleteURL = `${CONSTANTS.BASE_API_URL}/deletemedia?fileID=${encodeURIComponent(fileID)}`;
    console.log('Deleting media with fileID:', fileID);

    fetch(apiDeleteURL, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('[DeleteMedia()] Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Successful deletion:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}