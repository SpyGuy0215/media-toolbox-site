'use client';
import * as React from 'react';
import SidebarButton from './SidebarButton';
import { LuAudioLines, LuHouse, LuRefreshCw, LuGithub, LuBug, LuMenu } from "react-icons/lu";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {useIsMobile} from '@/hooks/use-mobile';
import {Sheet, SheetTrigger, SheetContent} from '@/components/ui/sheet';

export default function Sidebar() {
    const isMobile = useIsMobile();

    const sidebarInner = (
        <div className={'flex flex-col h-full'}>
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
                        onClick={() => window.open('https://github.com/SpyGuy0215/media-toolbox')}
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
                <p id={'version'} className={'text-sm text-gray-500 mb-2 text-mono'}>v1.2.0</p>
                <p className={'text-sm text-gray-500'}>Made by Shashank Prasanna</p>
            </div>
        </div>
    );

    // Desktop: show fixed sidebar. Mobile: show hamburger that opens sheet
    if (isMobile) {
        return (
            <div className={'fixed top-2 left-2 z-50'}>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant={'outline'} size={'icon'} className={'shadow bg-white/90 backdrop-blur'}>
                            <LuMenu className={'h-5 w-5'} />
                            <span className="sr-only">Open navigation</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side={'left'} className={'p-4 w-72'}>
                        {sidebarInner}
                    </SheetContent>
                </Sheet>
            </div>
        );
    }

    return(
        <div id={'sidebar'} className={'border-r border-gray-200 bg-slate-50 p-4 h-screen flex flex-col w-1/6 min-w-72'}>
            {sidebarInner}
        </div>
    )
}