import * as React from 'react';
import SidebarButton from './SidebarButton';
import { LuAudioLines, LuHouse, LuRefreshCw } from "react-icons/lu";
import {Separator} from "@/components/ui/separator";

export default function Sidebar() {
    return(
        <div id={'sidebar'} className={'border-r border-gray-200 bg-slate-50 p-4 h-screen flex flex-col w-1/6 min-w-72'}>
            <h1 className={'font-inter text-2xl font-bold mt-4 w-full text-center'}>Media Toolbox</h1>
            <Separator className={'mt-6'}/>
            <SidebarButton icon={<LuHouse />} className={'mt-4 py-6'} url={'/'}>Home</SidebarButton>
            <SidebarButton icon={<LuRefreshCw />} className={'py-6'} url={'/convert'}>Convert Files</SidebarButton>
            <SidebarButton icon={<LuAudioLines />} className={'py-6'} url={'/transcribe'}>Transcribe Audio</SidebarButton>
            <div id={'sidebar-footer'} className={'mt-auto'}>
                <Separator className={'mb-4'}/>
                <p id={'version'} className={'text-sm text-gray-500 mb-2 text-mono'}>v1.1.0</p>
                <p className={'text-sm text-gray-500'}>Made by Shashank Prasanna</p>
            </div>
        </div>
    )
}