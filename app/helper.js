import useWebSocket, { ReadyState } from 'react-use-websocket';

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