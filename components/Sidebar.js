import * as React from 'react';
import SidebarButton from './SidebarButton';
import { LuAudioLines, LuHouse, LuRefreshCw, LuGithub, LuBug } from "react-icons/lu";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";

export default function Sidebar() {
    return(
        <div id={'sidebar'} className={'border-r border-gray-200 bg-slate-50 p-4 h-screen flex flex-col w-1/6 min-w-72'}>
            <h1 className={'font-inter text-2xl font-bold mt-4 w-full text-center'}>Media Toolbox</h1>
            <Separator className={'mt-6'}/>
            <SidebarButton icon={<LuHouse />} className={'mt-4 py-6'} url={'/'}>Home</SidebarButton>
            <SidebarButton icon={<LuRefreshCw />} className={'py-6'} url={'/convert'}>Convert Files</SidebarButton>
            <SidebarButton icon={<LuAudioLines />} className={'py-6'} url={'/transcribe'}>Transcribe Audio</SidebarButton>
            <div id={'sidebar-footer'} className={'mt-auto flex flex-col'}>
                <Separator className={'mb-4'}/>
                <Button className={'mb-2 w-2/3 mx-auto'}
                onClick={() => window.open('https://github.com/SpyGuy0215/media-toolbox-site')}
                >
                    <LuGithub />
                    Website
                </Button>
                <Button className={'mb-2 w-2/3 mx-auto'}
                        onClick={() => window.open('https://github.com/SpyGuy0215/media-toolbox-site')}
                >
                    <LuGithub />
                    Server
                </Button>
                <Button className={'mb-10 w-2/3 mx-auto bg-blue-500 hover:bg-blue-600'}
                        onClick={() => window.open('https://github.com/SpyGuy0215/media-toolbox/issues')}
                >
                    <LuBug />
                    Report a Bug
                </Button>
                <p id={'version'} className={'text-sm text-gray-500 mb-2 text-mono'}>v1.1.0</p>
                <p className={'text-sm text-gray-500'}>Made by Shashank Prasanna</p>
            </div>
        </div>
    )
}