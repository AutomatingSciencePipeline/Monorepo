'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redeemShareLink } from '../../lib/mongodb_funcs';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useDebounce } from "use-debounce";

const SharePage = () => {
    return (
        <div>
            <Suspense fallback={<div>Loading...</div>}>
                <SharePageContent />
            </Suspense>
        </div>
    );
};

const SharePageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const link = searchParams ? searchParams.get('link') : "";
    const session = useSession();

    const [debouncedSession] = useDebounce(session, 500);
    const [debouncedSessionData] = useDebounce(debouncedSession.data, 1000);
    const [isLinkRedeemed, setIsLinkRedeemed] = useState(false);

    useEffect(() => {
        if (debouncedSession.data && !isLinkRedeemed){
            if(debouncedSession.data.user){
                if(debouncedSession.data.user.id){
                    if(link){
                        redeemShareLink(link, debouncedSession.data.user.id).then(() => {
                            setIsLinkRedeemed(true);
                            router.push('/dashboard?toastMessage=' + encodeURIComponent("Successfully redeemed share link!") + "&toastType=success");
                        }).catch((err) => {
                            setIsLinkRedeemed(true);
                            router.push('/dashboard?toastMessage=' + encodeURIComponent("An error occurred while redeeming share link!") + "&toastType=error");
                        });
                    }
                }
            }
        }
    }, [debouncedSessionData, isLinkRedeemed]);

    useEffect(() => {
        if(debouncedSession.status === "unauthenticated"){
            toast.error("You must be signed in to redeem a share link!", {duration: 2000});
            //Push to router after 2 seconds
            setTimeout(() => {
                router.push('/signin');
            }, 2000);
        }
    }, [debouncedSession.status]);

    return (
        <div>
            <p>Loading...</p>
        </div>
    );
};

export default SharePage;