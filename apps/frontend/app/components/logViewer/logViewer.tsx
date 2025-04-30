'use client';

import { useEffect, useState, useRef } from 'react';
import { getK8sLogs } from '../../../lib/k8s_funcs';
import { useSession } from 'next-auth/react';
import { getDocumentFromId } from '../../../lib/mongodb_funcs';
import { redirect } from 'next/navigation';

export default function LogViewer({ expId }: { expId: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        const fetchLogs = async () => {
            // First get the experiment from the database
            const exp: { _id: string; status?: string } = await getDocumentFromId(expId);
            if (!exp) {
                console.error('Experiment not found');
                return;
            }

            if (exp.status !== 'RUNNING') {
                redirect('/dashboard?toastMessage=' + encodeURIComponent("Experiment is not running!") + "&toastType=error");
            }

            try {
                const response = await getK8sLogs(expId);
                setLogs(response.split('\n'));
                setLoading(false);
            } catch (error) {
                console.error('Error fetching logs:', error);
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [expId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-2 h-full"> {/* Flex column + fixed height */}
            <button 
                onClick={scrollToBottom}
                className="self-end bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
            >
                Jump to bottom
            </button>

            <div 
                ref={logsContainerRef}
                className="flex-1 overflow-y-auto bg-gray-100 p-4 rounded shadow-inner"
            >
                {logs.map((log, index) => (
                    <pre key={index} className="text-sm text-gray-700 whitespace-pre-wrap">
                        {log}
                    </pre>
                ))}
            </div>
        </div>
    );
}
