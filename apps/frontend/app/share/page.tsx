'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redeemShareLink } from '../../lib/mongodb_funcs';
import { useSession } from 'next-auth/react';

const SharePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const link = searchParams ? searchParams.get('link') : "";
    const { data: session } = useSession();

    var message = "";


    redeemShareLink(link!, session?.user?.id!).then(() => {
        message = "Successfully redeemed share link!";
    }).catch((err) => {
        message = "An error occurred while redeeming share link!";
    }).finally(() => {
        setTimeout(() => {
            router.push('/dashboard?toastMessage=' + encodeURIComponent(message) + "&toastType=" + (message === "Successfully redeemed share link!" ? "success" : "error"));
        }, 1000);  
    });

    return (
        <div>
            <div>
                <p>Loading...</p>
            </div>
        </div>
    );
};

export default SharePage;