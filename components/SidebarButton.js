 import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function SidebarButton({ icon, children, className, url }) {
    return (
        <Button
            variant="ghost"
            className={`w-full justify-start text-md ${className}`}
            onClick={() => {
                if (url) {
                    window.location.href = url;
                }
            }}
        >
            <span className="mr-3 scale-140">{icon}</span>
            {children}
        </Button>
    );
}