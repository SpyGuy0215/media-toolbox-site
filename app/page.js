'use client';
import * as React from "react";
import {useState, useEffect} from "react";
import Sidebar from "@/components/Sidebar";
import * as CONSTANTS from "./constants";

export default function Home() {
    const [serverStatus, setServerStatus] = useState({status: "unknown"});

    useEffect(() => {
        async function getStatus() {
            const status = await fetchServerStatus();
            setServerStatus(status);
        }
        getStatus().then(r =>
        console.log("[page.js] Server status set to: ", serverStatus));
    }, []);

    async function fetchServerStatus() {
        const apiStatusURL = CONSTANTS.BASE_API_URL;
        console.log("[page.js] Fetching server status from " + apiStatusURL);
        try {
            const response = await fetch(apiStatusURL);
            console.log(response.ok); // Log the response.ok value
            if (!response.ok) {
                throw new Error("Network response was not ok");
                return {status: "offline"};
            }
            const data = await response.json();
            console.log("[page.js] Server status data: ", data);
            return {status: "online"};
        } catch (error) {
            console.error("Error fetching server status:", error);
            return {status: "offline"};
        }
    }

    return(
        <div id={'main'} className={'flex flex-row'}>
            <Sidebar />
            <div id={'content'} className={'p-8 flex flex-col w-full'}>
                <h1 className={'font-inter text-4xl font-bold'}>Home</h1>
                <div id={'quick-start'} className={'mt-8 flex flex-row w-full'}>
                    <div id={'server-status-card'} className={'flex flex-col w-1/4 h-fit p-4 border border-gray-300 rounded-lg'}>
                        <h2 className={'font-inter text-2xl font-semibold'}>Server Status</h2>
                        <p className={'mt-2 text-gray-700 text-sm'}>The current status of the backend server.</p>
                        <div className={'mt-4 flex flex-row'}>
                            <div className={`w-3 h-3 rounded-full my-auto mr-2 ${serverStatus.status === "online" ? "bg-green-500" : serverStatus.status === "offline" ? "bg-red-500" : "bg-gray-500"}`}></div>
                            <p className={'text-gray-800 font-medium'}>{serverStatus.status === "unknown" ? "Fetching status..." : serverStatus.status === "online" ? "Online" : "Offline"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}